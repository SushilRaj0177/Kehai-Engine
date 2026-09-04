import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { verifyQrToken } from "../utils/qrToken.js";
import { checkGeofence } from "../utils/geo.js";
import { emitAttendanceUpdate } from "../realtime/socket.js";

export interface CheckInInput {
  eventId: string;
  userId: string;
  qrToken: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface CheckInResult {
  attendance: Awaited<ReturnType<typeof prisma.attendanceRecord.create>>;
  distanceMeters: number;
  confidence: string;
}

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const event = await prisma.event.findUnique({ where: { id: input.eventId } });
  if (!event) throw HttpError.notFound("Event not found");

  if (event.status !== "ACTIVE" && event.status !== "PUBLISHED") {
    throw HttpError.badRequest("This event is not currently accepting check-ins");
  }
  if (event.qrRevoked) throw HttpError.badRequest("This event's QR code has been revoked");

  const now = new Date();
  const windowStart = new Date(event.startsAt.getTime() - event.attendanceOpensMinutesBefore * 60_000);
  const windowEnd = new Date(event.endsAt.getTime() + event.attendanceClosesMinutesAfter * 60_000);
  if (now < windowStart) {
    throw HttpError.badRequest("Check-in has not opened yet for this event");
  }
  if (now > windowEnd) {
    throw HttpError.badRequest("Check-in has closed for this event");
  }

  let qrPayload;
  try {
    qrPayload = verifyQrToken(input.qrToken, event.id, event.qrSecret);
  } catch {
    throw HttpError.badRequest("This QR code is invalid or has expired — ask the organizer to rescan");
  }

  const geofence = checkGeofence({
    eventLocation: { latitude: event.latitude, longitude: event.longitude },
    geofenceRadiusM: event.geofenceRadiusM,
    userLocation: { latitude: input.latitude, longitude: input.longitude },
    accuracyMeters: input.accuracyMeters ?? null,
  });

  if (!geofence.withinFence) {
    throw new HttpError(422, "OUTSIDE_GEOFENCE", `You appear to be ${Math.round(geofence.distanceMeters)}m from the venue — move closer and try again.`, {
      distanceMeters: Math.round(geofence.distanceMeters),
      allowedRadiusM: event.geofenceRadiusM,
    });
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: input.userId } },
  });
  if (existing) throw HttpError.conflict("You have already checked in to this event");

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: input.userId } },
  });

  const attendance = await prisma.attendanceRecord.create({
    data: {
      eventId: event.id,
      userId: input.userId,
      registrationId: registration?.id,
      method: "QR_GEO",
      latitude: round(input.latitude, 5),
      longitude: round(input.longitude, 5),
      accuracyMeters: input.accuracyMeters,
      distanceMeters: geofence.distanceMeters,
      locationConfidence: geofence.confidence,
      qrTokenJti: qrPayload.jti,
    },
  });

  const [totalAttendance, totalRegistrations, user] = await Promise.all([
    prisma.attendanceRecord.count({ where: { eventId: event.id } }),
    prisma.registration.count({ where: { eventId: event.id } }),
    prisma.user.findUnique({ where: { id: input.userId } }),
  ]);

  emitAttendanceUpdate(event.id, {
    type: "checkin",
    attendeeName: user?.name ?? "Attendee",
    checkedInAt: attendance.checkedInAt.toISOString(),
    totalAttendance,
    totalRegistrations,
    attendanceRate: totalRegistrations > 0 ? totalAttendance / totalRegistrations : 0,
  });

  return { attendance, distanceMeters: geofence.distanceMeters, confidence: geofence.confidence };
}

export async function manualOverride(eventId: string, targetUserId: string, overriddenById: string) {
  const existing = await prisma.attendanceRecord.findUnique({
    where: { eventId_userId: { eventId, userId: targetUserId } },
  });
  if (existing) throw HttpError.conflict("Attendee has already been checked in");

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId: targetUserId } },
  });

  const attendance = await prisma.attendanceRecord.create({
    data: {
      eventId,
      userId: targetUserId,
      registrationId: registration?.id,
      method: "MANUAL_OVERRIDE",
      latitude: event.latitude,
      longitude: event.longitude,
      distanceMeters: 0,
      locationConfidence: "low",
      qrTokenJti: "manual-override",
      overriddenById,
    },
  });

  await prisma.auditLog.create({
    data: {
      eventId,
      actorUserId: overriddenById,
      action: "attendance.override",
      metadata: { targetUserId },
    },
  });

  return attendance;
}

function round(n: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
