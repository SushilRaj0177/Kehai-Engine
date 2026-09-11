import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../utils/mailer.js";
import { env } from "../config/env.js";

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
      },
      include: { student: { select: { name: true, email: true } } },
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
      await sendEmail(
        enrollment.student.email,
        `Your attendance in ${classroom.name}`,
        `<p>Hi ${enrollment.student.name},</p>
         <p>You've attended ${present} of ${totalSessions} sessions in <strong>${classroom.name}</strong>
         (${Math.round(rate * 100)}%) — below the usual bar for staying on track.</p>
         <p>If something's come up, it's worth a word with your teacher: <a href="${link}">${link}</a></p>`
      );

      await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastNudgedAt: now } });
      sent++;
    }
  }

  return { sent };
}
