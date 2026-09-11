import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { issueQrToken } from "../utils/qrToken.js";
import type { EventStatus } from "@prisma/client";

export interface CreateEventInput {
  name: string;
  description?: string | null;
  venue: string;
  startsAt: Date;
  endsAt: Date;
  registrationOpensAt?: Date | null;
  registrationClosesAt?: Date | null;
  attendanceOpensMinutesBefore: number;
  attendanceClosesMinutesAfter: number;
  capacity?: number | null;
  latitude: number;
  longitude: number;
  geofenceRadiusM: number;
  qrRotationSeconds: number;
}

export async function createEvent(organizationId: string, createdById: string, input: CreateEventInput) {
  return prisma.event.create({
    data: {
      organizationId,
      createdById,
      ...input,
      qrSecret: crypto.randomBytes(24).toString("hex"),
    },
  });
}

export async function updateEvent(eventId: string, input: Partial<CreateEventInput>) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  if (event.status === "COMPLETED" || event.status === "CANCELLED") {
    throw HttpError.badRequest("Cannot edit a completed or cancelled event");
  }
  return prisma.event.update({ where: { id: eventId }, data: input });
}

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED", "DRAFT"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  // A COMPLETED or CANCELLED event isn't necessarily done for good — an
  // organizer who closed it too early, or wants to reopen check-ins for a
  // second round, needs a way back rather than having to recreate the
  // event from scratch.
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["DRAFT"],
};

export async function transitionEventStatus(eventId: string, nextStatus: EventStatus) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");

  const allowed = VALID_TRANSITIONS[event.status];
  if (!allowed.includes(nextStatus)) {
    throw HttpError.badRequest(`Cannot move event from ${event.status} to ${nextStatus}`);
  }

  // Restarting out of COMPLETED/CANCELLED should actually work again, not
  // silently stay broken because a QR revoked before the earlier close is
  // still revoked — that would just trade one "why isn't this working"
  // confusion for another.
  const isRestart = event.status === "COMPLETED" || event.status === "CANCELLED";
  // The event's original startsAt/endsAt are almost certainly in the past
  // by the time someone restarts it — going straight back to ACTIVE would
  // just recreate the "marked live, check-in window already closed" trap
  // this whole restart feature exists to escape. Restarting to ACTIVE
  // re-anchors the window to right now with a deliberately generous,
  // effectively open-ended end time (a year out), so the event genuinely
  // accepts check-ins immediately instead of needing an extra "extend"
  // click before it actually works.
  const isRestartingLive = isRestart && nextStatus === "ACTIVE";
  const now = new Date();

  return prisma.event.update({
    where: { id: eventId },
    data: {
      status: nextStatus,
      cancelledAt: nextStatus === "CANCELLED" ? new Date() : null,
      qrRevoked: isRestart ? false : undefined,
      startsAt: isRestartingLive ? now : undefined,
      endsAt: isRestartingLive ? new Date(now.getTime() + 365 * 24 * 60 * 60_000) : undefined,
    },
  });
}

export async function deleteEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  if (event.status === "ACTIVE") {
    throw HttpError.badRequest("Cannot delete an active event — cancel it first");
  }
  await prisma.event.delete({ where: { id: eventId } });
}

export async function registerForEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  if (event.status !== "PUBLISHED" && event.status !== "ACTIVE") {
    throw HttpError.badRequest("Registration is not open for this event");
  }
  const now = new Date();
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    throw HttpError.badRequest("Registration has not opened yet");
  }
  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    throw HttpError.badRequest("Registration has closed");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Two people registering for the last open spot at the same instant
      // would otherwise both pass a plain count-then-create check before
      // either commits. Locking the event row first forces the second
      // transaction to wait for the first to finish, so its capacity count
      // is guaranteed to see the first registration.
      if (event.capacity != null) {
        await tx.$executeRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
        const count = await tx.registration.count({ where: { eventId } });
        if (count >= event.capacity) throw HttpError.conflict("This event is at capacity");
      }
      return await tx.registration.create({ data: { eventId, userId } });
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw HttpError.conflict("Already registered for this event");
    throw err;
  }
}

/**
 * Issues a fresh, short-lived signed QR token for an active event. Called
 * repeatedly by the organizer's display (every qrRotationSeconds) so the
 * rendered QR code image rotates and a screenshot goes stale quickly.
 */
export async function issueEventQr(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  if (event.qrRevoked) throw HttpError.badRequest("This event's QR code has been revoked");
  if (event.status !== "ACTIVE" && event.status !== "PUBLISHED") {
    throw HttpError.badRequest("Event must be published or active to issue a check-in QR code");
  }

  const ttl = Math.max(event.qrRotationSeconds * 2, 30); // grace window beyond one rotation
  const { token, jti, expiresAt } = issueQrToken(event.id, event.qrSecret, ttl);
  return { token, jti, expiresAt, rotationSeconds: event.qrRotationSeconds };
}

export async function revokeEventQr(eventId: string) {
  return prisma.event.update({ where: { id: eventId }, data: { qrRevoked: true } });
}
