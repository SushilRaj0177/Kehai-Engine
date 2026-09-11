import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { issueQrToken } from "../utils/qrToken.js";
import { sendEmail } from "../utils/mailer.js";
import { signUnsubscribeToken } from "../utils/unsubscribeToken.js";
import { env } from "../config/env.js";
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

// A DRAFT is the one status an organizer expects to stay private until they
// publish it — every other status is already visible on the public
// discovery/browse routes, so only DRAFT needs a membership check here.
export async function getEventForViewer(eventId: string, viewerUserId: string | undefined) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      _count: { select: { registrations: true, attendances: true } },
    },
  });
  if (!event) throw HttpError.notFound("Event not found");

  if (event.status === "DRAFT") {
    const membership = viewerUserId
      ? await prisma.membership.findUnique({
          where: { userId_organizationId: { userId: viewerUserId, organizationId: event.organizationId } },
        })
      : null;
    if (!membership) throw HttpError.notFound("Event not found");
  }

  let isRegistered = false;
  let isWaitlisted = false;
  let hasAttended = false;
  if (viewerUserId) {
    const [reg, att] = await Promise.all([
      prisma.registration.findUnique({ where: { eventId_userId: { eventId: event.id, userId: viewerUserId } } }),
      prisma.attendanceRecord.findUnique({ where: { eventId_userId: { eventId: event.id, userId: viewerUserId } } }),
    ]);
    isRegistered = !!reg;
    isWaitlisted = !!reg?.waitlisted;
    hasAttended = !!att;
  }

  // Never leak the QR signing secret to clients
  const { qrSecret, ...safeEvent } = event;
  return { ...safeEvent, isRegistered, isWaitlisted, hasAttended };
}

export async function updateEvent(eventId: string, input: Partial<CreateEventInput>) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  if (event.status === "COMPLETED" || event.status === "CANCELLED") {
    throw HttpError.badRequest("Cannot edit a completed or cancelled event");
  }
  const updated = await prisma.event.update({ where: { id: eventId }, data: input });

  // Raising capacity (or removing the cap) can open spots for anyone
  // already on the waitlist — check whenever capacity was part of this
  // edit, not just when it went up, since promoteFromWaitlist is a no-op
  // when there's nothing to promote.
  if ("capacity" in input) await promoteFromWaitlist(eventId);

  return updated;
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
        // Waitlisted registrations don't count against capacity — they're
        // the overflow a full event is already carrying.
        const count = await tx.registration.count({ where: { eventId, waitlisted: false } });
        if (count >= event.capacity) {
          return await tx.registration.create({ data: { eventId, userId, waitlisted: true } });
        }
      }
      return await tx.registration.create({ data: { eventId, userId } });
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw HttpError.conflict("Already registered for this event");
    throw err;
  }
}

// Promotes as many waitlisted registrations as the event now has room for,
// oldest first. Called any time a spot might have opened up: a registration
// is removed/cancelled, or an organizer raises capacity. Safe to call when
// nothing changed — it just promotes zero people.
async function promoteFromWaitlist(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  let openSpots = Infinity;
  if (event.capacity != null) {
    const activeCount = await prisma.registration.count({ where: { eventId, waitlisted: false } });
    openSpots = event.capacity - activeCount;
  }
  if (openSpots <= 0) return;

  const promotable = await prisma.registration.findMany({
    where: { eventId, waitlisted: true },
    orderBy: { createdAt: "asc" },
    take: openSpots === Infinity ? undefined : openSpots,
    include: { user: { select: { id: true, name: true, email: true, emailNotificationsEnabled: true } } },
  });

  for (const registration of promotable) {
    await prisma.registration.update({ where: { id: registration.id }, data: { waitlisted: false } });

    if (registration.user.emailNotificationsEnabled) {
      const link = `${env.WEB_ORIGIN}/events/${eventId}`;
      const unsubscribeLink = `${env.API_ORIGIN}/api/notifications/unsubscribe?token=${signUnsubscribeToken(registration.user.id)}`;
      await sendEmail(
        registration.user.email,
        `You're off the waitlist for ${event.name}`,
        `<p>Hi ${registration.user.name},</p>
         <p>A spot opened up in <strong>${event.name}</strong> and you've been moved from the waitlist to a confirmed registration.</p>
         <p><a href="${link}">${link}</a></p>
         <p style="margin-top:24px;color:#888;font-size:12px;"><a href="${unsubscribeLink}">Unsubscribe from these emails</a></p>`
      );
    }
  }
}

// Only for a registrant who hasn't checked in yet — once there's a real
// AttendanceRecord, deleting the Registration would just null out its
// registrationId (the FK is ON DELETE SET NULL) and leave an orphaned
// attendance row behind, which reads as "attended but never registered"
// everywhere the two get joined together. An organizer who needs to undo
// an actual check-in has the manual-override path's mirror image to reach
// for instead — this is specifically for "this person shouldn't be on the
// list at all yet".
export async function removeRegistration(eventId: string, userId: string, actorId: string) {
  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { attendance: true, event: { select: { organizationId: true } } },
  });
  if (!registration) throw HttpError.notFound("This registration doesn't exist");
  if (registration.attendance) {
    throw HttpError.badRequest("This attendee has already checked in — their registration can't be removed");
  }
  await prisma.registration.delete({ where: { id: registration.id } });

  await prisma.auditLog.create({
    data: {
      organizationId: registration.event.organizationId,
      eventId,
      actorUserId: actorId,
      action: "registration.removed",
      metadata: { targetUserId: userId },
    },
  });

  // Only freed up a spot if the removed registration was actually counted
  // against capacity — removing someone already on the waitlist doesn't.
  if (!registration.waitlisted) await promoteFromWaitlist(eventId);
}

// Self-service mirror of removeRegistration, for the registrant themselves
// rather than an organizer — same "not yet checked in" restriction, same
// waitlist-promotion side effect once a spot frees up.
export async function cancelMyRegistration(eventId: string, userId: string) {
  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { attendance: true },
  });
  if (!registration) throw HttpError.notFound("You aren't registered for this event");
  if (registration.attendance) {
    throw HttpError.badRequest("You've already checked in — this registration can't be cancelled");
  }
  await prisma.registration.delete({ where: { id: registration.id } });

  if (!registration.waitlisted) await promoteFromWaitlist(eventId);
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
