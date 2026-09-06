"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { QrRotationInput } from "./ui/QrRotationInput";
import { useLocale } from "@/lib/i18n";

interface QrResponse {
  dataUrl: string;
  expiresAt: string;
  rotationSeconds: number;
}

/**
 * The classroom-session equivalent of LiveQrPanel — same rotating-QR visual
 * and interaction pattern, pointed at a specific session (identified by
 * sessionId, passed down by the parent once it knows which one is open —
 * the parent only mounts this while a session is actually open) instead of
 * a one-off event. Kept as its own small component (rather than
 * generalizing LiveQrPanel's base path) so the existing event control room
 * usage is never at risk of regressing.
 */
export function ClassSessionQrPanel({
  classroomId,
  sessionId,
  onEndSession,
  ending,
}: {
  classroomId: string;
  sessionId: string;
  onEndSession: () => void;
  ending: boolean;
}) {
  const { t } = useLocale();
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingRotation, setSavingRotation] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      const data = await apiFetch<QrResponse>(`/api/classrooms/${classroomId}/sessions/${sessionId}/qr`);
      setQr(data);
      setError(null);
      setCountdown(data.rotationSeconds);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("qrPanel.qrLoadError"));
    }
  }, [classroomId, sessionId, t]);

  useEffect(() => {
    setQr(null);
    void fetchQr();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, fetchQr]);

  useEffect(() => {
    if (!qr) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void fetchQr();
          return qr.rotationSeconds;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr?.expiresAt, sessionId]);

  async function changeRotation(seconds: number) {
    setSavingRotation(true);
    setError(null);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ qrRotationSeconds: seconds }),
      });
      await fetchQr();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("qrPanel.rotationUpdateError"));
    } finally {
      setSavingRotation(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
        <span>{t("qrPanel.heading")}</span>
        {qr && <span className="font-mono text-shu-400">{t("qrPanel.refreshingIn", { seconds: countdown })}</span>}
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 py-6">
        {error ? (
          <p className="text-sm text-shu-400">{error}</p>
        ) : qr ? (
          <div className="relative rounded-xl border-4 border-white bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.dataUrl} alt={t("qrPanel.altText")} width={260} height={260} />
          </div>
        ) : (
          <div className="h-64 w-64 animate-pulse rounded-xl bg-white/5" />
        )}
        <p className="max-w-xs text-center text-[11px] leading-relaxed text-white/35">{t("qrPanel.rotationNote")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchQr}>
            {t("qrPanel.refreshNow")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? t("qrPanel.closeSettings") : t("qrPanel.changeRotation")}
          </Button>
          <Button variant="danger" size="sm" loading={ending} onClick={onEndSession}>
            {t("classroomDetail.endSession")}
          </Button>
        </div>

        {showSettings && qr && (
          <div className="w-full border-t border-white/10 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">{t("qrPanel.rotationIntervalLabel")}</p>
            <QrRotationInput value={qr.rotationSeconds} onChange={changeRotation} disabled={savingRotation} />
            <p className="mt-2 text-[11px] text-white/35">{t("qrPanel.rotationTakesEffect")}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
