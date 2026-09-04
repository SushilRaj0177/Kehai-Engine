import crypto from "node:crypto";
import type { EventAnalytics, OrgOverview } from "../services/analytics.service.js";
import type { Anomaly } from "../services/anomaly.service.js";

/**
 * Data minimization: the AI layer only ever receives the already-computed,
 * aggregate analytics numbers — never raw attendee rows, emails, or precise
 * coordinates. This keeps prompts small, cheap, and privacy-respecting, and
 * means the model literally cannot leak an individual's PII because it was
 * never given any.
 */
export interface EventInsightContext {
  event: {
    name: string;
    status: string;
    startsAt: string;
  };
  metrics: Omit<EventAnalytics, "eventId" | "eventName" | "status" | "startsAt">;
  anomalies: Anomaly[];
  recentComparableEvents: Array<{ name: string; attendanceRate: number; registrations: number }>;
}

export function buildEventInsightContext(
  analytics: EventAnalytics,
  anomalies: Anomaly[],
  orgOverview: OrgOverview
): EventInsightContext {
  const { eventId, eventName, status, startsAt, ...metrics } = analytics;
  return {
    event: { name: eventName, status, startsAt },
    metrics,
    anomalies,
    recentComparableEvents: orgOverview.events
      .filter((e) => e.id !== eventId && e.registrations > 0)
      .slice(0, 5)
      .map((e) => ({ name: e.name, attendanceRate: e.attendanceRate, registrations: e.registrations })),
  };
}

export function hashContext(context: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(context)).digest("hex");
}
