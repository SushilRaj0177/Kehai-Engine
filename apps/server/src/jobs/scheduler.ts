import { sendEventReminders } from "../services/reminder.service.js";
import { sendLowAttendanceNudges } from "../services/nudge.service.js";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes — frequent enough
// that the 24h reminder window (see reminder.service.ts) is never missed by
// more than a few minutes, infrequent enough to not matter for load.

const NUDGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — the nudge's own
// weekly-per-enrollment cooldown (see nudge.service.ts) means checking more
// often than this buys nothing, just extra DB scans across every classroom.

function repeat(name: string, run: () => Promise<{ sent: number }>, intervalMs: number) {
  // Each job also has its own per-row cooldown (reminderSentAt / lastNudgedAt),
  // set in the same pass it's checked — but that's not atomic against two
  // ticks racing each other: a tick that runs long (many rows, a slow SMTP
  // call) can still be mid-loop when the next interval fires, re-fetch the
  // same not-yet-marked rows, and double-send before the first tick's
  // update lands. This flag is the actual mutex — skip a tick outright if
  // the previous one hasn't finished, rather than relying on the cooldown
  // alone to make overlapping runs safe.
  let running = false;
  async function tick() {
    if (running) {
      console.warn(`[scheduler] ${name}: previous tick still running, skipping this one`);
      return;
    }
    running = true;
    try {
      const { sent } = await run();
      if (sent > 0) console.log(`[scheduler] ${name}: sent ${sent}`);
    } catch (err) {
      // A failed tick should never crash the process or block the next one
      // — same reasoning as index.ts's unhandledRejection guard.
      console.error(`[scheduler] ${name} tick failed:`, err);
    } finally {
      running = false;
    }
  }
  void tick();
  setInterval(tick, intervalMs);
}

/**
 * The whole "background job" system for this API: a couple of in-process
 * intervals, no external scheduler or queue required. This only works
 * because the server runs as a single always-on process (a Render web
 * service, not a serverless function) — if that ever changes, these need to
 * move to real cron triggers hitting an endpoint instead.
 */
export function startScheduler(): void {
  repeat("event reminders", sendEventReminders, REMINDER_INTERVAL_MS);
  repeat("attendance nudges", sendLowAttendanceNudges, NUDGE_INTERVAL_MS);
}
