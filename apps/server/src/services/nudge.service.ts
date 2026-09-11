import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../utils/mailer.js";
import { signUnsubscribeToken } from "../utils/unsubscribeToken.js";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

// Same threshold and minimum-sessions gate as the "Attendance risk" panel
// teachers see (AtRiskStudents.tsx) — a student only gets nudged once they'd
// actually show up on that list, so the email and the UI never disagree
// about who's "at risk".
const RISK_THRESHOLD = 0.75;
const MIN_SESSIONS = 3;
const NUDGE_COOLDOWN_DAYS = 7;

/**
 * Emails every enrolled student whose attendance has dropped under the risk
 * threshold, at most once per week per classroom — lastNudgedAt is the
 * cooldown, checked and set in the same pass, so this is safe to call as
 * often as the scheduler likes.
 */
export async function sendLowAttendanceNudges(now: Date = new Date()): Promise<{ sent: number }> {
  const cooldownCutoff = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const classrooms = await prisma.classroom.findMany({ select: { id: true, name: true } });

  let sent = 0;
  for (const classroom of classrooms) {
    const totalSessions = await prisma.classSession.count({ where: { classroomId: classroom.id } });
    if (totalSessions < MIN_SESSIONS) continue;

    const enrollments = await prisma.enrollment.findMany({
      where: {
        classroomId: classroom.id,
        OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: cooldownCutoff } }],
        student: { emailNotificationsEnabled: true },
      },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
    if (enrollments.length === 0) continue;

    const counts = await prisma.classAttendance.groupBy({
      by: ["enrollmentId"],
      where: { enrollmentId: { in: enrollments.map((e) => e.id) } },
      _count: { _all: true },
    });
    const presentByEnrollment = new Map(counts.map((c) => [c.enrollmentId, c._count._all]));

    for (const enrollment of enrollments) {
      const present = presentByEnrollment.get(enrollment.id) ?? 0;
      const rate = present / totalSessions;
      if (rate >= RISK_THRESHOLD) continue;

      const link = `${env.WEB_ORIGIN}/classrooms/${classroom.id}`;
      const unsubscribeLink = `${env.API_ORIGIN}/api/notifications/unsubscribe?token=${signUnsubscribeToken(enrollment.student.id)}`;
      await sendEmail(
        enrollment.student.email,
        `Your attendance in ${classroom.name}`,
        `<p>Hi ${enrollment.student.name},</p>
         <p>You've attended ${present} of ${totalSessions} sessions in <strong>${classroom.name}</strong>
         (${Math.round(rate * 100)}%) — below the usual bar for staying on track.</p>
         <p>If something's come up, it's worth a word with your teacher: <a href="${link}">${link}</a></p>
         <p style="margin-top:24px;color:#888;font-size:12px;"><a href="${unsubscribeLink}">Unsubscribe from these nudges</a></p>`
      );

      await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastNudgedAt: now } });
      sent++;
    }
  }

  return { sent };
}

// Teacher-triggered mirror of the automated pass above, for "I noticed this
// one student right now, don't make me wait a week for the cooldown to
// clear." Bypasses NUDGE_COOLDOWN_DAYS entirely (a teacher explicitly
// asking for this is a stronger signal than the scheduler's own timing),
// but still respects the student's own unsubscribe choice — a teacher
// can't use this to route around that — and still stamps lastNudgedAt so
// the automated pass doesn't immediately re-send the same nudge.
export async function sendManualNudge(classroomId: string, studentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { classroomId_studentId: { classroomId, studentId } },
    include: { student: { select: { id: true, name: true, email: true, emailNotificationsEnabled: true } } },
  });
  if (!enrollment) throw HttpError.notFound("This student is not enrolled in this classroom");
  if (!enrollment.student.emailNotificationsEnabled) {
    throw HttpError.badRequest("This student has unsubscribed from these emails");
  }

  const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: classroomId } });
  const totalSessions = await prisma.classSession.count({ where: { classroomId } });
  const present = await prisma.classAttendance.count({ where: { enrollmentId: enrollment.id } });
  const rate = totalSessions > 0 ? present / totalSessions : 0;

  const link = `${env.WEB_ORIGIN}/classrooms/${classroomId}`;
  const unsubscribeLink = `${env.API_ORIGIN}/api/notifications/unsubscribe?token=${signUnsubscribeToken(enrollment.student.id)}`;
  await sendEmail(
    enrollment.student.email,
    `Your attendance in ${classroom.name}`,
    `<p>Hi ${enrollment.student.name},</p>
     <p>You've attended ${present} of ${totalSessions} sessions in <strong>${classroom.name}</strong>
     (${Math.round(rate * 100)}%) — below the usual bar for staying on track.</p>
     <p>If something's come up, it's worth a word with your teacher: <a href="${link}">${link}</a></p>
     <p style="margin-top:24px;color:#888;font-size:12px;"><a href="${unsubscribeLink}">Unsubscribe from these nudges</a></p>`
  );

  await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastNudgedAt: new Date() } });
}
