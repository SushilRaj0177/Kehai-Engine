"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { LoadingBlock } from "./ui/States";
import { useAiStatus, useEventAnomalies, useEventInsights } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export function AiInsightsPanel({ eventId, orgId }: { eventId: string; orgId: string }) {
  const { t } = useLocale();
  const { data: aiStatus } = useAiStatus();
  const [wantInsights, setWantInsights] = useState(false);
  const { data: insights, isLoading: insightsLoading } = useEventInsights(eventId, wantInsights);
  const { data: anomalies } = useEventAnomalies(eventId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
          <span>{t("aiInsights.heading")}</span>
          <span className={`text-[10px] normal-case tracking-normal ${aiStatus?.enabled ? "text-emerald-400" : "text-white/30"}`}>
            {aiStatus?.enabled ? t("aiInsights.providerConnected") : t("aiInsights.noProvider")}
          </span>
        </CardHeader>
        <CardBody>
          {!wantInsights ? (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-white/45">
                {t("aiInsights.generateHint")}
              </p>
              <Button variant="cyan" size="sm" onClick={() => setWantInsights(true)}>
                {t("aiInsights.generateButton")}
              </Button>
            </div>
          ) : insightsLoading ? (
            <LoadingBlock label={t("aiInsights.analyzing")} />
          ) : insights ? (
            <div>
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-semibold text-white">{insights.headline}</p>
                <Badge status={insights.confidence}>
                  {t(`badge.confidenceLevel.${insights.confidence}`)} {t("badge.confidenceSuffix")}
                </Badge>
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
                  <span className="font-semibold text-kehai-400">{t("aiInsights.recommendationLabel")}</span>
                  {insights.recommendation}
                </div>
              )}
              <p className="mt-3 text-[10px] uppercase tracking-wider text-white/25">
                {insights.aiGenerated ? t("aiInsights.aiInterpreted") : t("aiInsights.deterministicFallback")}
                {insights.cached ? t("aiInsights.cachedSuffix") : ""}
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {anomalies && anomalies.length > 0 && (
        <Card>
          <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("aiInsights.anomaliesHeading")}</CardHeader>
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
            <p className="pt-1 text-[10px] uppercase tracking-wider text-white/25">{t("aiInsights.anomaliesNote")}</p>
          </CardBody>
        </Card>
      )}

      <AskAiBox orgId={orgId} />
    </div>
  );
}

function AskAiBox({ orgId }: { orgId: string }) {
  const { t } = useLocale();
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
      setAnswer({ answer: err?.message ?? t("aiInsights.askError"), aiGenerated: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("aiInsights.askHeading")}</CardHeader>
      <CardBody>
        <form onSubmit={ask} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("aiInsights.askPlaceholder")}
            underline={false}
            className="min-w-0 flex-1"
          />
          <Button type="submit" loading={loading} size="md" className="w-full sm:w-auto">
            {t("aiInsights.askButton")}
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
