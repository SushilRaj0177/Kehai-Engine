import { sendEventReminders } from "../services/reminder.service.js";

const TICK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes — frequent enough that
// the 24h reminder window (see reminder.service.ts) is never missed by more
// than a few minutes, infrequent enough to not matter for load.

/**
 * The whole "background job" system for this API: one in-process interval,
 * no external scheduler or queue required. This only works because the
 * server runs as a single always-on process (a Render web service, not a
 * serverless function) — if that ever changes, this needs to move to a real
 * cron trigger hitting an endpoint instead.
 */
export function startScheduler(): void {
  async function tick() {
    try {
      const { sent } = await sendEventReminders();
      if (sent > 0) console.log(`[scheduler] sent ${sent} event reminder(s)`);
    } catch (err) {
      // A failed tick should never crash the process or block the next one
      // — same reasoning as index.ts's unhandledRejection guard.
      console.error("[scheduler] reminder tick failed:", err);
    }
  }

  void tick();
  setInterval(tick, TICK_INTERVAL_MS);
}
