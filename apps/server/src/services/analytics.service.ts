import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";

export interface ArrivalBucket {
  minuteOffset: number; // minutes relative to event start
  count: number;
}

export interface EventAnalytics {
  eventId: string;
  eventName: string;
  status: string;
  startsAt: string;
  registrations: number;
  attendance: number;
  attendanceRate: number; // attendance / registrations
  noShowRate: number; // 1 - attendanceRate (registrants who never checked in)
  unregisteredAttendance: number; // walk-ins: attended but never registered
  earlyArrivals: number; // checked in before startsAt
  onTimeArrivals: number; // within 15 min of startsAt
  lateArrivals: number; // more than 15 min after startsAt
  arrivalTimeline: ArrivalBucket[];
  peakArrivalWindow: { startMinute: number; endMinute: number; count: number } | null;
  medianCheckInLatencyMinutes: number | null; // vs event start
  averageDistanceMeters: number | null;
  registrationToAttendanceConversion: number; // same as attendanceRate, named for clarity in NL answers
}

export async function computeEventAnalytics(eventId: string): Promise<EventAnalytics> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");

  const [registrations, attendances] = await Promise.all([
    prisma.registration.count({ where: { eventId } }),
    prisma.attendanceRecord.findMany({ where: { eventId }, select: { checkedInAt: true, distanceMeters: true, registrationId: true } }),
  ]);

  const attendanceCount = attendances.length;
  const attendanceRate = registrations > 0 ? attendanceCount / registrations : 0;
  const unregisteredAttendance = attendances.filter((a) => !a.registrationId).length;

  let early = 0;
  let onTime = 0;
  let late = 0;
  const offsets: number[] = [];
  const bucketMap = new Map<number, number>(); // 5-minute buckets

  for (const a of attendances) {
    const offsetMinutes = Math.round((a.checkedInAt.getTime() - event.startsAt.getTime()) / 60_000);
    offsets.push(offsetMinutes);

    if (offsetMinutes < 0) early++;
    else if (offsetMinutes <= 15) onTime++;
    else late++;

    const bucket = Math.floor(offsetMinutes / 5) * 5;
    bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1);
  }

  const arrivalTimeline: ArrivalBucket[] = [...bucketMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minuteOffset, count]) => ({ minuteOffset, count }));

  let peakArrivalWindow: EventAnalytics["peakArrivalWindow"] = null;
  if (arrivalTimeline.length > 0) {
    const peak = arrivalTimeline.reduce((max, b) => (b.count > max.count ? b : max), arrivalTimeline[0]);
    peakArrivalWindow = { startMinute: peak.minuteOffset, endMinute: peak.minuteOffset + 5, count: peak.count };
  }

  const medianCheckInLatencyMinutes = median(offsets);
  const distances = attendances.map((a) => a.distanceMeters).filter((d) => Number.isFinite(d));
  const averageDistanceMeters = distances.length > 0 ? distances.reduce((s, d) => s + d, 0) / distances.length : null;

  return {
    eventId: event.id,
    eventName: event.name,
    status: event.status,
    startsAt: event.startsAt.toISOString(),
    registrations,
    attendance: attendanceCount,
    attendanceRate,
    noShowRate: registrations > 0 ? 1 - attendanceRate : 0,
    unregisteredAttendance,
    earlyArrivals: early,
    onTimeArrivals: onTime,
    lateArrivals: late,
    arrivalTimeline,
    peakArrivalWindow,
    medianCheckInLatencyMinutes,
    averageDistanceMeters,
    registrationToAttendanceConversion: attendanceRate,
  };
}

export interface OrgOverview {
  totalEvents: number;
  completedEvents: number;
  totalRegistrations: number;
  totalAttendance: number;
  averageAttendanceRate: number;
  recurringAttendeeRate: number; // fraction of attendees who attended >1 event
  events: Array<{ id: string; name: string; startsAt: string; status: string; registrations: number; attendance: number; attendanceRate: number }>;
}

export async function computeOrgOverview(organizationId: string): Promise<OrgOverview> {
  const events = await prisma.event.findMany({
    where: { organizationId },
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { registrations: true, attendances: true } } },
  });

  const totalRegistrations = events.reduce((s, e) => s + e._count.registrations, 0);
  const totalAttendance = events.reduce((s, e) => s + e._count.attendances, 0);

  const rates = events
    .filter((e) => e._count.registrations > 0)
    .map((e) => e._count.attendances / e._count.registrations);
  const averageAttendanceRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;

  const attendanceByUser = await prisma.attendanceRecord.groupBy({
    by: ["userId"],
    where: { event: { organizationId } },
    _count: { eventId: true },
  });
  const recurring = attendanceByUser.filter((u) => u._count.eventId > 1).length;
  const recurringAttendeeRate = attendanceByUser.length > 0 ? recurring / attendanceByUser.length : 0;

  return {
    totalEvents: events.length,
    completedEvents: events.filter((e) => e.status === "COMPLETED").length,
    totalRegistrations,
    totalAttendance,
    averageAttendanceRate,
    recurringAttendeeRate,
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      startsAt: e.startsAt.toISOString(),
      status: e.status,
      registrations: e._count.registrations,
      attendance: e._count.attendances,
      attendanceRate: e._count.registrations > 0 ? e._count.attendances / e._count.registrations : 0,
    })),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
