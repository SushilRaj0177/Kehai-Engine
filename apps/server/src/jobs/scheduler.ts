import { sendEventReminders } from "../services/reminder.service.js";
import { sendLowAttendanceNudges } from "../services/nudge.service.js";

const REMINDER_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes — frequent enough
// that the 24h reminder window (see reminder.service.ts) is never missed by
// more than a few minutes, infrequent enough to not matter for load.

const NUDGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours — the nudge's own
// weekly-per-enrollment cooldown (see nudge.service.ts) means checking more
// often than this buys nothing, just extra DB scans across every classroom.

function repeat(name: string, run: () => Promise<{ sent: number }>, intervalMs: number) {
  async function tick() {
    try {
      const { sent } = await run();
      if (sent > 0) console.log(`[scheduler] ${name}: sent ${sent}`);
    } catch (err) {
      // A failed tick should never crash the process or block the next one
      // — same reasoning as index.ts's unhandledRejection guard.
      console.error(`[scheduler] ${name} tick failed:`, err);
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
