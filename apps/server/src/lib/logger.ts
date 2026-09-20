import { isProd } from "../config/env.js";

type LogMeta = Record<string, unknown>;

/**
 * Every log line carries a machine-parseable shape (JSON in production, so
 * a log aggregator — Render's own log viewer included — can filter/search
 * by field; a readable one-liner in dev) instead of console.log's default
 * "whatever got interpolated into a string." The one field worth calling
 * out is `requestId` (see middleware/requestId.ts): it's the only way to
 * connect "this specific request failed" in an access log line to the
 * stack trace this logger printed for it, across everything that request
 * touched.
 */
function write(level: "info" | "warn" | "error", message: string, meta?: LogMeta) {
  if (isProd) {
    console[level === "info" ? "log" : level](JSON.stringify({ level, message, ...meta, time: new Date().toISOString() }));
    return;
  }
  const suffix = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  console[level === "info" ? "log" : level](`[${level}] ${message}${suffix}`);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};
