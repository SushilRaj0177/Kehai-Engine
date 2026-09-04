import type { EventAnalytics } from "./analytics.service.js";
import type { OrgOverview } from "./analytics.service.js";

export interface Anomaly {
  type:
    | "attendance_spike"
    | "attendance_drop"
    | "high_no_show"
    | "unusual_arrival_timing"
    | "low_location_confidence_cluster"
    | "capacity_conflict";
  severity: "info" | "warning" | "critical";
  message: string;
  evidence: Record<string, unknown>;
}

/**
 * Deterministic, rule-based anomaly detection (Level 2 intelligence).
 * Runs entirely without an LLM — every finding here is a plain statistical
 * threshold check on real data, kept separate from the AI-interpreted
 * layer so the platform can always say precisely *why* something was
 * flagged.
 */
export function detectEventAnomalies(current: EventAnalytics, previousEvents: OrgOverview["events"]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (current.registrations >= 5 && current.noShowRate >= 0.6) {
    anomalies.push({
      type: "high_no_show",
      severity: current.noShowRate >= 0.8 ? "critical" : "warning",
      message: `${Math.round(current.noShowRate * 100)}% of registrants did not attend.`,
      evidence: { noShowRate: current.noShowRate, registrations: current.registrations },
    });
  }

  const comparable = previousEvents.filter((e) => e.id !== current.eventId && e.registrations > 0);
  if (comparable.length >= 2) {
    const avgRate = comparable.reduce((s, e) => s + e.attendanceRate, 0) / comparable.length;
    const delta = current.attendanceRate - avgRate;

    if (avgRate > 0 && delta <= -0.2) {
      anomalies.push({
        type: "attendance_drop",
        severity: delta <= -0.35 ? "critical" : "warning",
        message: `Attendance rate is ${Math.round(Math.abs(delta) * 100)} points below this organization's recent average.`,
        evidence: { currentRate: current.attendanceRate, historicalAverage: avgRate, sampleSize: comparable.length },
      });
    } else if (delta >= 0.2) {
      anomalies.push({
        type: "attendance_spike",
        severity: "info",
        message: `Attendance rate is ${Math.round(delta * 100)} points above this organization's recent average.`,
        evidence: { currentRate: current.attendanceRate, historicalAverage: avgRate, sampleSize: comparable.length },
      });
    }
  }

  if (current.attendance >= 10 && current.peakArrivalWindow) {
    const shareInPeak = current.peakArrivalWindow.count / current.attendance;
    if (shareInPeak >= 0.5) {
      anomalies.push({
        type: "unusual_arrival_timing",
        severity: "info",
        message: `${Math.round(shareInPeak * 100)}% of attendees checked in within a single 5-minute window — likely a queue or batch check-in.`,
        evidence: current.peakArrivalWindow,
      });
    }
  }

  return anomalies;
}
