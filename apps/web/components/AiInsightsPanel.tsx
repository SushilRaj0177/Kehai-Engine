"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { LoadingBlock } from "./ui/States";
import { useAiStatus, useEventAnomalies, useEventInsights } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

export function AiInsightsPanel({ eventId, orgId }: { eventId: string; orgId: string }) {
  const { data: aiStatus } = useAiStatus();
  const [wantInsights, setWantInsights] = useState(false);
  const { data: insights, isLoading: insightsLoading } = useEventInsights(eventId, wantInsights);
  const { data: anomalies } = useEventAnomalies(eventId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
          <span>AI Insights</span>
          <span className={`text-[10px] normal-case tracking-normal ${aiStatus?.enabled ? "text-emerald-400" : "text-white/30"}`}>
            {aiStatus?.enabled ? "provider connected" : "no AI provider configured"}
          </span>
        </CardHeader>
        <CardBody>
          {!wantInsights ? (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-white/45">
                Generate a grounded interpretation of this event&apos;s exact attendance metrics.
              </p>
              <Button variant="cyan" size="sm" onClick={() => setWantInsights(true)}>
                Generate insights
              </Button>
            </div>
          ) : insightsLoading ? (
            <LoadingBlock label="Analyzing…" />
          ) : insights ? (
            <div>
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold text-white">{insights.headline}</p>
                <Badge status={insights.confidence}>{insights.confidence} confidence</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {insights.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-white/70">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-kehai-400" />
                    {b}
                  </li>
                ))}
              </ul>
              {insights.recommendation && (
                <div className="mt-4 rounded-lg border border-kehai-500/25 bg-kehai-500/5 px-3 py-2.5 text-sm text-kehai-200">
                  <span className="font-semibold text-kehai-400">Recommendation — </span>
                  {insights.recommendation}
                </div>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-wider text-white/25">
                {insights.aiGenerated ? "AI-interpreted" : "Deterministic fallback (AI unavailable)"}
                {insights.cached ? " · cached" : ""}
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {anomalies && anomalies.length > 0 && (
        <Card>
          <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">Anomalies detected</CardHeader>
          <CardBody className="space-y-2">
            {anomalies.map((a, i) => (
              <div
                key={i}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  a.severity === "critical"
                    ? "border-shu-500/40 bg-shu-500/10 text-shu-200"
                    : a.severity === "warning"
                    ? "border-gold-500/30 bg-gold-500/5 text-gold-200"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                {a.message}
              </div>
            ))}
            <p className="pt-1 text-[10px] uppercase tracking-wider text-white/25">Deterministic rule-based detection — not AI-generated.</p>
          </CardBody>
        </Card>
      )}

      <AskAiBox orgId={orgId} />
    </div>
  );
}

function AskAiBox({ orgId }: { orgId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; aiGenerated: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const result = await apiFetch<{ answer: string; aiGenerated: boolean }>(`/api/ai/orgs/${orgId}/ask`, {
        method: "POST",
        body: JSON.stringify({ question }),
      });
      setAnswer(result);
    } catch (err: any) {
      setAnswer({ answer: err?.message ?? "Could not answer that.", aiGenerated: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">Ask your attendance data</CardHeader>
      <CardBody>
        <form onSubmit={ask} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Which event had the highest attendance rate?"
          />
          <Button type="submit" loading={loading} size="md">
            Ask
          </Button>
        </form>
        {answer && (
          <div className="mt-3 rounded-lg border border-white/10 bg-void-900/60 px-3 py-2.5 text-sm text-white/75">
            {answer.answer}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
