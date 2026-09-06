import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { generateJoinCode } from "../utils/joinCode.js";
import { verifyClassQrToken, issueClassQrToken, type ClassQrTokenPayload } from "../utils/classQrToken.js";
import { checkGeofence } from "../utils/geo.js";
import { computeStreaks, type StreakDay } from "../utils/streaks.js";
import { emitClassroomJoin, emitClassAttendanceUpdate } from "../realtime/socket.js";

export interface CreateClassroomInput {
  name: string;
  courseCode?: string;
  semesterLabel?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusM?: number;
}

/** Normalizes any Date/timestamp to UTC midnight of that calendar day. */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayUtcMidnight(): Date {
  return toUtcMidnight(new Date());
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function createClassroom(teacherId: string, input: CreateClassroomInput) {
  let joinCode = generateJoinCode();
  // Retry loop mirroring org.service.ts's slug-collision handling — a
  // 6-char code from a 33-character alphabet has ~39B combinations, so
  // collisions are rare, but we still guard against them explicitly.
  for (let attempts = 0; attempts < 10; attempts++) {
    const existing = await prisma.classroom.findUnique({ where: { joinCode } });
    if (!existing) break;
    joinCode = generateJoinCode();
  }

  return prisma.classroom.create({
    data: {
      teacherId,
      name: input.name,
      courseCode: input.courseCode,
      semesterLabel: input.semesterLabel,
      joinCode,
      latitude: input.latitude,
      longitude: input.longitude,
      geofenceRadiusM: input.geofenceRadiusM,
    },
  });
}

export async function updateClassroom(classroomId: string, input: Partial<CreateClassroomInput>) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");
  return prisma.classroom.update({ where: { id: classroomId }, data: input });
}

export async function deleteClassroom(classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");
  await prisma.classroom.delete({ where: { id: classroomId } });
}

export async function joinClassroom(code: string, studentId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { joinCode: code.toUpperCase() } });
  if (!classroom) throw HttpError.notFound("No classroom found with that join code");

  let enrollment;
  try {
    enrollment = await prisma.enrollment.create({
      data: { classroomId: classroom.id, studentId },
    });
  } catch (err: any) {
    if (err?.code === "P2002") throw HttpError.conflict("Already enrolled in this classroom");
    throw err;
  }

  const [student, totalEnrolled] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.enrollment.count({ where: { classroomId: classroom.id } }),
  ]);

  emitClassroomJoin(classroom.id, {
    studentName: student?.name ?? "Student",
    joinedAt: enrollment.createdAt.toISOString(),
    totalEnrolled,
  });

  return { classroom, enrollment };
}

export async function listMyClassrooms(teacherId: string) {
  const classrooms = await prisma.classroom.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enrollments: true, sessions: true } } },
  });

  return classrooms.map((c) => ({
    id: c.id,
    name: c.name,
    courseCode: c.courseCode,
    semesterLabel: c.semesterLabel,
    joinCode: c.joinCode,
    hasGeofence: c.latitude != null,
    geofenceRadiusM: c.geofenceRadiusM,
    createdAt: c.createdAt,
    studentCount: c._count.enrollments,
    sessionCount: c._count.sessions,
  }));
}

export async function listEnrolledClassrooms(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: { classroom: { include: { teacher: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const results = [];
  for (const enrollment of enrollments) {
    const { classroom } = enrollment;
    const sessions = await prisma.classSession.findMany({
      where: { classroomId: classroom.id },
      orderBy: { date: "asc" },
      select: { id: true, date: true },
    });
    const attendances = await prisma.classAttendance.findMany({
      where: { enrollmentId: enrollment.id },
      select: { sessionId: true },
    });
    const attendedSessionIds = new Set(attendances.map((a) => a.sessionId));

    const totalDays = sessions.length;
    const presentDays = attendances.length;
    const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;

    const streakDays: StreakDay[] = sessions.map((s) => ({
      date: toDateKey(s.date),
      present: attendedSessionIds.has(s.id),
    }));
    const { currentStreak } = computeStreaks(streakDays);

    results.push({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        courseCode: classroom.courseCode,
        semesterLabel: classroom.semesterLabel,
        teacherName: classroom.teacher.name,
        hasGeofence: classroom.latitude != null,
      },
      joinedAt: enrollment.createdAt,
      presentDays,
      totalDays,
      attendanceRate,
      currentStreak,
    });
  }

  return results;
}

export async function getClassroomDetail(classroomId: string, userId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  const isTeacher = classroom.teacherId === userId;
  const enrollment = isTeacher
    ? null
    : await prisma.enrollment.findUnique({
        where: { classroomId_studentId: { classroomId, studentId: userId } },
      });
  const isEnrolled = !!enrollment;

  if (!isTeacher && !isEnrolled) {
    throw HttpError.forbidden("You don't have access to this classroom");
  }

  const openSession = await prisma.classSession.findFirst({
    where: { classroomId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });

  const [studentCount, sessionCount] = await Promise.all([
    prisma.enrollment.count({ where: { classroomId } }),
    prisma.classSession.count({ where: { classroomId } }),
  ]);

  return {
    id: classroom.id,
    name: classroom.name,
    courseCode: classroom.courseCode,
    semesterLabel: classroom.semesterLabel,
    joinCode: isTeacher ? classroom.joinCode : undefined,
    hasGeofence: classroom.latitude != null,
    geofenceRadiusM: classroom.geofenceRadiusM,
    createdAt: classroom.createdAt,
    isTeacher,
    isEnrolled,
    studentCount,
    sessionCount,
    openSession: openSession
      ? { id: openSession.id, label: openSession.label, date: openSession.date, status: openSession.status }
      : null,
  };
}

export async function getRoster(classroomId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classroomId },
    include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  const sessions = await prisma.classSession.findMany({
    where: { classroomId },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });
  const totalDays = sessions.length;

  const roster = [];
  for (const enrollment of enrollments) {
    const attendances = await prisma.classAttendance.findMany({
      where: { enrollmentId: enrollment.id },
      orderBy: { checkedInAt: "asc" },
      select: { sessionId: true, checkedInAt: true },
    });
    const presentDays = attendances.length;
    const attendanceRate = totalDays > 0 ? presentDays / totalDays : 0;
    const lastAttendedAt = attendances.length > 0 ? attendances[attendances.length - 1].checkedInAt : null;

    roster.push({
      student: enrollment.student,
      enrolledAt: enrollment.createdAt,
      presentDays,
      totalDays,
      attendanceRate,
      lastAttendedAt,
    });
  }

  roster.sort((a, b) => a.student.name.localeCompare(b.student.name));
  return roster;
}

export interface HeatmapResponse {
  scope: "class" | "student";
  days: { date: string; level: 0 | 1 | 2 | 3 | 4 }[];
  totalSessions: number;
  presentCount: number;
  currentStreak: number;
  longestStreak: number;
}

export async function getHeatmap(
  classroomId: string,
  viewerId: string,
  viewerIsTeacher: boolean,
  studentId?: string
): Promise<HeatmapResponse> {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  let resolvedStudentId: string | undefined = studentId;
  if (!viewerIsTeacher) {
    if (studentId && studentId !== viewerId) {
      throw HttpError.forbidden("You can only view your own attendance heatmap");
    }
    resolvedStudentId = viewerId;
  }

  const sessions = await prisma.classSession.findMany({
    where: { classroomId },
    orderBy: { date: "asc" },
  });
  const totalSessions = sessions.length;

  const rangeStart = sessions.length > 0 ? toUtcMidnight(sessions[0].date) : toUtcMidnight(classroom.createdAt);
  const rangeEnd = todayUtcMidnight();

  // A classroom can now have any number of sessions on the same calendar
  // day (a lecture and a quiz, say), so each day buckets every session
  // that fell on it rather than assuming exactly one.
  const sessionsByDate = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = toDateKey(s.date);
    const bucket = sessionsByDate.get(key);
    if (bucket) bucket.push(s);
    else sessionsByDate.set(key, [s]);
  }

  if (!resolvedStudentId) {
    // Teacher viewing class-wide scope.
    const totalEnrolled = await prisma.enrollment.count({ where: { classroomId } });
    const attendanceCounts = new Map<string, number>();
    if (sessions.length > 0) {
      const counts = await prisma.classAttendance.groupBy({
        by: ["sessionId"],
        where: { sessionId: { in: sessions.map((s) => s.id) } },
        _count: { _all: true },
      });
      for (const c of counts) attendanceCounts.set(c.sessionId, c._count._all);
    }

    const days: { date: string; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = toDateKey(d);
      const daySessions = sessionsByDate.get(key);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (daySessions?.length) {
        const present = daySessions.reduce((sum, s) => sum + (attendanceCounts.get(s.id) ?? 0), 0);
        const rate = totalEnrolled > 0 ? present / (totalEnrolled * daySessions.length) : 0;
        if (rate > 0.75) level = 4;
        else if (rate > 0.5) level = 3;
        else if (rate > 0.25) level = 2;
        else if (rate > 0) level = 1;
        else level = 0;
      }
      days.push({ date: key, level });
    }

    return { scope: "class", days, totalSessions, presentCount: 0, currentStreak: 0, longestStreak: 0 };
  }

  // Student scope.
  const enrollment = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId, studentId: resolvedStudentId } },
  });
  const attendedSessionIds = new Set<string>();
  if (enrollment) {
    const attendances = await prisma.classAttendance.findMany({
      where: { enrollmentId: enrollment.id },
      select: { sessionId: true },
    });
    for (const a of attendances) attendedSessionIds.add(a.sessionId);
  }

  const days: { date: string; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  const streakDays: StreakDay[] = [];
  for (let d = new Date(rangeStart); d <= rangeEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = toDateKey(d);
    const daySessions = sessionsByDate.get(key);
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (daySessions?.length) {
      // Attended every session that day -> 4 (fully present). Attended
      // none -> 2, a distinct dim shade from "no class that day" (0).
      // Attended some but not all -> 3, a partial-attendance shade that
      // only matters now that a day can hold more than one session.
      const attendedCount = daySessions.filter((s) => attendedSessionIds.has(s.id)).length;
      const present = attendedCount > 0;
      level = attendedCount === daySessions.length ? 4 : attendedCount > 0 ? 3 : 2;
      streakDays.push({ date: key, present });
    }
    days.push({ date: key, level });
  }

  const { currentStreak, longestStreak } = computeStreaks(streakDays);

  return {
    scope: "student",
    days,
    totalSessions,
    presentCount: attendedSessionIds.size,
    currentStreak,
    longestStreak,
  };
}

// A classroom can hold any number of sessions — a lecture and a separate
// quiz on the same day, several sessions across a week, whatever the
// teacher needs — each independently nameable and restartable. To keep
// the QR/check-in flow unambiguous, at most one session is OPEN at a
// time per classroom: starting or reopening one auto-closes whichever
// session was previously open, rather than requiring the teacher to
// remember to close it first.
async function closeAnyOpenSession(classroomId: string) {
  await prisma.classSession.updateMany({
    where: { classroomId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
}

export async function createSession(classroomId: string, label?: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  await closeAnyOpenSession(classroomId);

  return prisma.classSession.create({
    data: {
      classroomId,
      label: label || null,
      date: todayUtcMidnight(),
      qrSecret: crypto.randomBytes(24).toString("hex"),
    },
  });
}

async function getOwnedSession(classroomId: string, sessionId: string) {
  const session = await prisma.classSession.findUnique({ where: { id: sessionId } });
  if (!session || session.classroomId !== classroomId) throw HttpError.notFound("Session not found");
  return session;
}

export async function closeSession(classroomId: string, sessionId: string) {
  const session = await getOwnedSession(classroomId, sessionId);
  if (session.status !== "OPEN") throw HttpError.conflict("Session is already closed");

  return prisma.classSession.update({
    where: { id: session.id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
}

export async function reopenSession(classroomId: string, sessionId: string) {
  const session = await getOwnedSession(classroomId, sessionId);
  if (session.status === "OPEN") return session;

  await closeAnyOpenSession(classroomId);

  return prisma.classSession.update({
    where: { id: session.id },
    data: { status: "OPEN", closedAt: null },
  });
}

export async function listSessions(classroomId: string) {
  const sessions = await prisma.classSession.findMany({
    where: { classroomId },
    orderBy: { openedAt: "desc" },
  });
  if (sessions.length === 0) return [];

  const counts = await prisma.classAttendance.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessions.map((s) => s.id) } },
    _count: { _all: true },
  });
  const presentCounts = new Map(counts.map((c) => [c.sessionId, c._count._all]));

  return sessions.map((s) => ({
    id: s.id,
    label: s.label,
    date: s.date,
    status: s.status,
    qrRotationSeconds: s.qrRotationSeconds,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    presentCount: presentCounts.get(s.id) ?? 0,
  }));
}

export async function updateSession(classroomId: string, sessionId: string, input: { label?: string; qrRotationSeconds?: number }) {
  const session = await getOwnedSession(classroomId, sessionId);
  return prisma.classSession.update({
    where: { id: session.id },
    data: {
      ...(input.label !== undefined ? { label: input.label || null } : {}),
      ...(input.qrRotationSeconds !== undefined ? { qrRotationSeconds: input.qrRotationSeconds } : {}),
    },
  });
}

export async function issueSessionQr(classroomId: string, sessionId: string) {
  const session = await getOwnedSession(classroomId, sessionId);
  if (session.status !== "OPEN") throw HttpError.badRequest("This session is closed — restart it first");

  const ttl = Math.max(session.qrRotationSeconds * 2, 30);
  const { token, jti, expiresAt } = issueClassQrToken(session.id, session.qrSecret, ttl);
  return { token, jti, expiresAt, rotationSeconds: session.qrRotationSeconds };
}

export interface ClassCheckInInput {
  qrToken: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export async function checkInToClassroom(classroomId: string, studentId: string, input: ClassCheckInInput) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  const enrollment = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  if (!enrollment) throw HttpError.forbidden("You are not enrolled in this classroom");

  // A classroom can have more than one session (open or otherwise) at any
  // given time in its history, so which session this check-in belongs to
  // comes from the QR token itself — decode (not yet verify) it to learn
  // the sessionId, then verify the signature with that specific session's
  // own secret. This also means check-in is inherently scoped to whichever
  // session issued the code, with no day-based lookup involved at all.
  const unverified = jwt.decode(input.qrToken) as (ClassQrTokenPayload & jwt.JwtPayload) | null;
  if (!unverified?.sessionId) {
    throw HttpError.badRequest("This QR code is invalid or has expired — ask your teacher to refresh it");
  }

  const session = await prisma.classSession.findUnique({ where: { id: unverified.sessionId } });
  if (!session || session.classroomId !== classroomId || session.status !== "OPEN") {
    throw HttpError.badRequest("There is no open check-in session for this class right now");
  }

  let qrPayload;
  try {
    qrPayload = verifyClassQrToken(input.qrToken, session.id, session.qrSecret);
  } catch {
    throw HttpError.badRequest("This QR code is invalid or has expired — ask your teacher to refresh it");
  }

  let latitude: number | null = input.latitude ?? null;
  let longitude: number | null = input.longitude ?? null;
  let distanceMeters: number | null = null;
  let confidence: string | null = null;

  if (classroom.latitude != null && classroom.longitude != null && classroom.geofenceRadiusM != null) {
    if (input.latitude == null || input.longitude == null) {
      throw HttpError.badRequest("Location is required to check in to this class");
    }

    const geofence = checkGeofence({
      eventLocation: { latitude: classroom.latitude, longitude: classroom.longitude },
      geofenceRadiusM: classroom.geofenceRadiusM,
      userLocation: { latitude: input.latitude, longitude: input.longitude },
      accuracyMeters: input.accuracyMeters ?? null,
    });

    if (!geofence.withinFence) {
      throw new HttpError(
        422,
        "OUTSIDE_GEOFENCE",
        `You appear to be ${Math.round(geofence.distanceMeters)}m from the classroom — move closer and try again.`,
        {
          distanceMeters: Math.round(geofence.distanceMeters),
          allowedRadiusM: classroom.geofenceRadiusM,
        }
      );
    }

    distanceMeters = geofence.distanceMeters;
    confidence = geofence.confidence;
  }

  const existing = await prisma.classAttendance.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId } },
  });
  if (existing) throw HttpError.conflict("You have already checked in to this session");

  const attendance = await prisma.classAttendance.create({
    data: {
      sessionId: session.id,
      enrollmentId: enrollment.id,
      studentId,
      latitude,
      longitude,
      accuracyMeters: input.accuracyMeters,
      distanceMeters,
      locationConfidence: confidence,
      qrTokenJti: qrPayload.jti,
    },
  });

  const [totalPresent, totalEnrolled, student] = await Promise.all([
    prisma.classAttendance.count({ where: { sessionId: session.id } }),
    prisma.enrollment.count({ where: { classroomId } }),
    prisma.user.findUnique({ where: { id: studentId } }),
  ]);

  emitClassAttendanceUpdate(classroomId, {
    type: "checkin",
    studentName: student?.name ?? "Student",
    checkedInAt: attendance.checkedInAt.toISOString(),
    totalPresent,
    totalEnrolled,
    attendanceRate: totalEnrolled > 0 ? totalPresent / totalEnrolled : 0,
  });

  return { attendance, distanceMeters, confidence };
}
