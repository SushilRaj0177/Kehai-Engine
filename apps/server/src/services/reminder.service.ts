import { prisma } from "../lib/prisma.js";
import { sendEmail } from "../utils/mailer.js";
import { signUnsubscribeToken } from "../utils/unsubscribeToken.js";
import { env } from "../config/env.js";

// How far ahead of an event's start to send the "starts soon" reminder.
// A single-pass window (not "23-25h before", say) works because
// reminderSentAt is the real idempotency guard — a registration inside the
// window gets emailed exactly once no matter how often the scheduler ticks
// or how it drifts against the window's edges.
const REMINDER_WINDOW_HOURS = 24;

/**
 * Emails every registrant whose event starts within the reminder window and
 * hasn't been reminded yet. Safe to call as often as the scheduler likes —
 * `reminderSentAt` is set in the same pass a reminder goes out, so a
 * registration is never picked up twice.
 */
export async function sendEventReminders(now: Date = new Date()): Promise<{ sent: number }> {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const registrations = await prisma.registration.findMany({
    where: {
      reminderSentAt: null,
      user: { emailNotificationsEnabled: true },
      event: {
        status: { in: ["PUBLISHED", "ACTIVE"] },
        startsAt: { gte: now, lte: windowEnd },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true, venue: true, startsAt: true } },
    },
  });

  let sent = 0;
  for (const registration of registrations) {
    const link = `${env.WEB_ORIGIN}/events/${registration.event.id}`;
    const startsAt = registration.event.startsAt.toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });

    const unsubscribeLink = `${env.API_ORIGIN}/api/notifications/unsubscribe?token=${signUnsubscribeToken(registration.user.id)}`;
    await sendEmail(
      registration.user.email,
      `${registration.event.name} starts soon`,
      `<p>Hi ${registration.user.name},</p>
       <p><strong>${registration.event.name}</strong> starts ${startsAt} UTC at ${registration.event.venue} — coming up within the next day.</p>
       <p>Have your QR check-in ready: <a href="${link}">${link}</a></p>
       <p style="margin-top:24px;color:#888;font-size:12px;"><a href="${unsubscribeLink}">Unsubscribe from these reminders</a></p>`
    );

    // Marked sent right after this one email, not batched at the end — if
    // the process dies partway through a large run, everyone already
    // emailed stays marked and nobody gets a duplicate on the next tick.
    await prisma.registration.update({
      where: { id: registration.id },
      data: { reminderSentAt: new Date() },
    });
    sent++;
  }

  return { sent };
}
