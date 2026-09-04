import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { aiEnabled, structuredCall, textCall } from "./provider.js";
import * as analyticsService from "../services/analytics.service.js";

/**
 * Level 4 intelligence: natural-language interrogation of an organization's
 * event data.
 *
 * The model NEVER writes or executes a query itself. It only chooses among
 * a small fixed set of safe, predefined "intents" (deterministic backend
 * functions) and supplies their parameters as structured JSON. We execute
 * the matching function ourselves against Prisma, then hand the *exact*
 * numeric result back to the model purely to phrase a readable answer. This
 * makes SQL injection and hallucinated numbers structurally impossible —
 * the model cannot produce a figure that didn't come from computation.
 */

const INTENTS = [
  "org_overview",
  "best_event",
  "worst_no_show",
  "arrival_pattern",
  "compare_events",
  "recommendation",
] as const;

const intentSchema = z.object({
  intent: z.enum(INTENTS),
  eventNameHint: z.string().nullable().optional(),
});

export interface NlQueryResult {
  answer: string;
  intent: string;
  supportingData: unknown;
  aiGenerated: boolean;
}

export async function answerOrgQuestion(organizationId: string, question: string): Promise<NlQueryResult> {
  const overview = await analyticsService.computeOrgOverview(organizationId);

  if (overview.events.length === 0) {
    return {
      answer: "This organization has no events yet, so there's nothing to analyze.",
      intent: "org_overview",
      supportingData: overview,
      aiGenerated: false,
    };
  }

  if (!aiEnabled) {
    return {
      answer:
        "AI natural-language answers are not configured on this server (no ANTHROPIC_API_KEY). " +
        `Here's the raw overview instead: ${overview.totalEvents} events, ` +
        `${overview.totalAttendance}/${overview.totalRegistrations} total attendance ` +
        `(${Math.round(overview.averageAttendanceRate * 100)}% average rate).`,
      intent: "org_overview",
      supportingData: overview,
      aiGenerated: false,
    };
  }

  const routed = await structuredCall({
    system:
      "You route organizer questions about their event attendance data to one predefined analysis function. " +
      "You never compute numbers yourself — you only pick the best matching intent.",
    prompt: `Organizer question: "${question}"\n\nAvailable intents:\n${INTENTS.join(", ")}\n\nPick the single best match.`,
    toolName: "route_intent",
    toolDescription: "Select which deterministic analysis to run for this question.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string", enum: [...INTENTS] },
        eventNameHint: { type: ["string", "null"], description: "Event name mentioned in the question, if any" },
      },
      required: ["intent"],
    },
    validate: (raw) => intentSchema.parse(raw),
  });

  const supportingData = executeIntent(routed.intent, overview, routed.eventNameHint ?? null);

  const answer = await textCall({
    system:
      "You answer an organizer's question using ONLY the JSON data provided. Never state a number that " +
      "is not present in the JSON. Be concise (2-4 sentences). If the data doesn't fully answer the " +
      "question, say what's missing.",
    prompt: `Question: "${question}"\n\nComputed data:\n${JSON.stringify(supportingData, null, 2)}\n\nAnswer the question.`,
    maxTokens: 400,
  });

  return { answer: answer.trim(), intent: routed.intent, supportingData, aiGenerated: true };
}

function executeIntent(intent: (typeof INTENTS)[number], overview: analyticsService.OrgOverview, nameHint: string | null) {
  switch (intent) {
    case "org_overview":
      return overview;

    case "best_event": {
      const ranked = [...overview.events].filter((e) => e.registrations > 0).sort((a, b) => b.attendanceRate - a.attendanceRate);
      return { ranked: ranked.slice(0, 5) };
    }

    case "worst_no_show": {
      const ranked = [...overview.events]
        .filter((e) => e.registrations > 0)
        .sort((a, b) => a.attendanceRate - b.attendanceRate);
      return { ranked: ranked.slice(0, 5).map((e) => ({ ...e, noShowRate: 1 - e.attendanceRate })) };
    }

    case "compare_events": {
      const matched = nameHint
        ? overview.events.filter((e) => e.name.toLowerCase().includes(nameHint.toLowerCase()))
        : overview.events.slice(0, 3);
      return { compared: matched };
    }

    case "arrival_pattern":
    case "recommendation":
    default: {
      const withEnoughData = overview.events.filter((e) => e.registrations >= 5);
      return {
        note:
          withEnoughData.length < 3
            ? "Fewer than 3 events with 5+ registrants — not enough history for a reliable pattern or recommendation."
            : "Sufficient history for a general pattern.",
        events: withEnoughData,
      };
    }
  }
}

const reportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })),
  observations: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type PostEventReport = z.infer<typeof reportSchema>;

export async function generatePostEventReport(eventId: string): Promise<PostEventReport & { aiGenerated: boolean }> {
  const analytics = await analyticsService.computeEventAnalytics(eventId);
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");
  const overview = await analyticsService.computeOrgOverview(event.organizationId);

  if (!aiEnabled) {
    return {
      title: `${analytics.eventName} — Attendance Summary`,
      summary: `${analytics.attendance} of ${analytics.registrations} registrants attended (${Math.round(analytics.attendanceRate * 100)}%).`,
      metrics: [
        { label: "Registrations", value: String(analytics.registrations) },
        { label: "Attendance", value: String(analytics.attendance) },
        { label: "Attendance rate", value: `${Math.round(analytics.attendanceRate * 100)}%` },
      ],
      observations: [],
      recommendations: [],
      aiGenerated: false,
    };
  }

  const report = await structuredCall({
    system:
      "You write a short, organizer-facing post-event report using only the exact JSON metrics provided. " +
      "Never invent a figure. Prefer concrete, actionable recommendations over generic advice.",
    prompt: `Event metrics:\n${JSON.stringify(analytics, null, 2)}\n\nOrganization history:\n${JSON.stringify(overview.events.slice(0, 6), null, 2)}`,
    toolName: "emit_report",
    toolDescription: "Return a structured post-event report.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        metrics: {
          type: "array",
          items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] },
        },
        observations: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      },
      required: ["title", "summary", "metrics", "observations", "recommendations"],
    },
    maxTokens: 1200,
    validate: (raw) => reportSchema.parse(raw),
  });

  return { ...report, aiGenerated: true };
}
