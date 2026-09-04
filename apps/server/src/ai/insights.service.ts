import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { aiEnabled, structuredCall } from "./provider.js";
import { buildEventInsightContext, hashContext } from "./context.js";
import * as analyticsService from "../services/analytics.service.js";
import { detectEventAnomalies } from "../services/anomaly.service.js";

const insightSchema = z.object({
  headline: z.string(),
  bullets: z.array(z.string()).min(1).max(6),
  recommendation: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
});
export type EventInsights = z.infer<typeof insightSchema>;

const REPORT_SYSTEM_PROMPT = `You are the analytics narrator for Kehai Engine, an event attendance intelligence platform.
You are given ONLY pre-computed, exact aggregate statistics for one event — never raw attendee data.
Your job is strictly interpretation: explain what the numbers mean and suggest one concrete, actionable
recommendation. Never invent a number that isn't in the provided data. If the data is too thin to
support a claim (e.g. fewer than 3 comparable past events for a trend claim), say so explicitly instead
of guessing. Keep bullets short and concrete — an organizer should understand each one in one read.`;

/**
 * Level 3 intelligence: turns deterministic Level-1 metrics and Level-2
 * rule-based anomalies into a short, human-readable interpretation.
 * Cached per (event, inputHash) so re-opening a dashboard doesn't re-spend
 * tokens on unchanged data, and falls back to a deterministic summary if no
 * AI provider is configured or the call fails — the dashboard never breaks.
 */
export async function getEventInsights(eventId: string): Promise<EventInsights & { cached: boolean; aiGenerated: boolean }> {
  const analytics = await analyticsService.computeEventAnalytics(eventId);
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const overview = await analyticsService.computeOrgOverview(event.organizationId);
  const anomalies = detectEventAnomalies(analytics, overview.events);
  const context = buildEventInsightContext(analytics, anomalies, overview);
  const inputHash = hashContext(context);

  const cached = await prisma.aiInsightCache.findUnique({
    where: { eventId_kind_inputHash: { eventId, kind: "insight_bullets", inputHash } },
  });
  if (cached) {
    return { ...(cached.content as EventInsights), cached: true, aiGenerated: true };
  }

  if (!aiEnabled) {
    return { ...deterministicFallback(context), cached: false, aiGenerated: false };
  }

  try {
    const result = await structuredCall({
      system: REPORT_SYSTEM_PROMPT,
      prompt: `Here is the event context as JSON:\n${JSON.stringify(context, null, 2)}\n\nProduce insights.`,
      toolName: "emit_event_insights",
      toolDescription: "Return structured insights about this event's attendance performance.",
      inputSchema: {
        type: "object",
        properties: {
          headline: { type: "string", description: "One sentence summarizing event performance" },
          bullets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
          recommendation: { type: ["string", "null"], description: "One concrete suggestion, or null if data is too thin" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["headline", "bullets", "recommendation", "confidence"],
      },
      validate: (raw) => insightSchema.parse(raw),
    });

    await prisma.aiInsightCache.create({
      data: { eventId, kind: "insight_bullets", inputHash, content: result },
    });

    return { ...result, cached: false, aiGenerated: true };
  } catch (err) {
    console.error("AI insight generation failed, falling back to deterministic summary:", err);
    return { ...deterministicFallback(context), cached: false, aiGenerated: false };
  }
}

function deterministicFallback(context: ReturnType<typeof buildEventInsightContext>): EventInsights {
  const { metrics } = context;
  const bullets: string[] = [
    `${metrics.attendance} of ${metrics.registrations} registrants attended (${Math.round(metrics.attendanceRate * 100)}%).`,
  ];
  if (metrics.peakArrivalWindow) {
    bullets.push(
      `Most check-ins happened between ${metrics.peakArrivalWindow.startMinute} and ${metrics.peakArrivalWindow.endMinute} minutes relative to the start time.`
    );
  }
  if (context.anomalies.length > 0) {
    bullets.push(context.anomalies[0].message);
  }
  return {
    headline: `${Math.round(metrics.attendanceRate * 100)}% attendance rate`,
    bullets,
    recommendation: null,
    confidence: "medium",
  };
}
