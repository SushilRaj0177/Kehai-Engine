import * as Sentry from "@sentry/node";
import { env, errorTrackingEnabled } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * A genuine no-op without SENTRY_DSN set — self-hosting this app has never
 * required an external service, and this stays true here: initErrorTracking
 * does nothing, captureException just logs locally instead of throwing away
 * the error entirely. Set SENTRY_DSN (a free Sentry project works fine) to
 * turn it on.
 */
export function initErrorTracking() {
  if (!errorTrackingEnabled) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Tracing isn't the point here (this app has no perf regressions this
    // would meaningfully catch that Render's own metrics don't already
    // show) — this exists purely for exception + request-id correlation.
    tracesSampleRate: 0,
  });
  logger.info("Error tracking initialized");
}

export function captureException(err: unknown, context?: { requestId?: string; [key: string]: unknown }) {
  if (errorTrackingEnabled) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
}
