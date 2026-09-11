"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch, ApiError } from "@/lib/api";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { QrRotationInput } from "./ui/QrRotationInput";
import { formatCountdown } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

interface QrResponse {
  dataUrl: string;
  expiresAt: string;
  rotationSeconds: number;
}

export function LiveQrPanel({
  eventId,
  active,
  editable = false,
  eventName,
}: {
  eventId: string;
  active: boolean;
  editable?: boolean;
  eventName?: string;
}) {
  const { t } = useLocale();
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingRotation, setSavingRotation] = useState(false);
  const [kiosk, setKiosk] = useState(false);
  const kioskRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      const data = await apiFetch<QrResponse>(`/api/qr/events/${eventId}/qr-image`);
      setQr(data);
      setError(null);
      setCountdown(Math.min(86400, Math.max(0, data.rotationSeconds)));
    } catch (err: any) {
      setError(err?.message ?? t("qrPanel.qrLoadError"));
    }
  }, [eventId, t]);

  useEffect(() => {
    if (!active) return;
    void fetchQr();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, fetchQr]);

  useEffect(() => {
    if (!qr || !active) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void fetchQr();
          return Math.min(86400, Math.max(0, qr.rotationSeconds));
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr?.expiresAt, active]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setKiosk(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!kiosk) return;
    // A rejected requestFullscreen leaves the CSS overlay as the only
    // fullscreen-ish thing on screen — the real Fullscreen API's own Esc
    // handling (via fullscreenchange, above) never fires in that case, so
    // this is the only way out for that fallback path.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") exitKiosk();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosk]);

  function enterKiosk() {
    setKiosk(true);
  }

  useEffect(() => {
    if (!kiosk) return;
    // kioskRef only points at a real element once this render has
    // committed — requesting fullscreen synchronously inside the click
    // handler that calls setKiosk would still see a null ref, since the
    // portal-rendered overlay hasn't mounted yet at that point.
    kioskRef.current?.requestFullscreen?.().catch(() => {
      // Best-effort — some browsers/embedded contexts refuse fullscreen
      // (no user-activation chain, permissions policy, etc). The CSS
      // overlay already fills the viewport either way, so a rejected
      // request just means the browser chrome stays visible, not a failure.
    });
  }, [kiosk]);

  function exitKiosk() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setKiosk(false);
  }

  async function changeRotation(seconds: number) {
    setSavingRotation(true);
    setError(null);
    try {
      await apiFetch(`/api/events/${eventId}`, {
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

  if (!active) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-white/40">
          {t("qrPanel.inactiveHint")}
        </CardBody>
      </Card>
    );
  }

  return (
    <>
    <Card className="overflow-hidden">
      <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
        <span>{t("qrPanel.heading")}</span>
        {qr && <span className="font-mono text-shu-400">{t("qrPanel.refreshingIn", { time: formatCountdown(countdown) })}</span>}
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
        <p className="max-w-xs text-center text-[11px] leading-relaxed text-white/35">
          {t("qrPanel.rotationNote")}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchQr}>
            {t("qrPanel.refreshNow")}
          </Button>
          <Button variant="cyan" size="sm" onClick={enterKiosk} disabled={!qr}>
            {t("qrPanel.fullscreenDisplay")}
          </Button>
          {editable && (
            <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
              {showSettings ? t("qrPanel.closeSettings") : t("qrPanel.changeRotation")}
            </Button>
          )}
        </div>

        {editable && showSettings && qr && (
          <div className="w-full border-t border-white/10 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">{t("qrPanel.rotationIntervalLabel")}</p>
            <QrRotationInput value={qr.rotationSeconds} onChange={changeRotation} disabled={savingRotation} />
            <p className="mt-2 text-[11px] text-white/35">
              {t("qrPanel.rotationTakesEffect")}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
    {/* Rendered via a portal straight to document.body, not as a plain
        descendant of the Card above — Card's own backdrop-blur creates a
        CSS containing block for any fixed-position element inside it, so a
        `fixed inset-0` here would otherwise be pinned to the Card's own
        box instead of the viewport. A portal escapes that entirely, on top
        of also being the only sane way to guarantee this actually paints
        above every other backdrop-blur/transform ancestor on the page,
        not just this one. requestFullscreen is attempted opportunistically
        in enterKiosk for browsers that allow it; this overlay is what
        makes the display big and scannable either way. */}
    {kiosk &&
      createPortal(
        <div ref={kioskRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-8">
          <button
            type="button"
            onClick={exitKiosk}
            className="absolute right-6 top-6 rounded-full border border-void-950/15 px-4 py-2 text-sm font-semibold text-void-950/70 hover:bg-void-950/5"
          >
            {t("qrPanel.exitFullscreen")}
          </button>
          {eventName && <p className="text-2xl font-bold text-void-950">{eventName}</p>}
          {qr && <img src={qr.dataUrl} alt={t("qrPanel.altText")} className="h-[min(70vh,70vw)] w-[min(70vh,70vw)]" />}
          <p className="font-mono text-lg text-void-950/60">{t("qrPanel.refreshingIn", { time: formatCountdown(countdown) })}</p>
        </div>,
        document.body
      )}
    </>
  );
}
