"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { QrRotationInput } from "./ui/QrRotationInput";

interface QrResponse {
  dataUrl: string;
  expiresAt: string;
  rotationSeconds: number;
}

export function LiveQrPanel({ eventId, active, editable = false }: { eventId: string; active: boolean; editable?: boolean }) {
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingRotation, setSavingRotation] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQr = useCallback(async () => {
    try {
      const data = await apiFetch<QrResponse>(`/api/qr/events/${eventId}/qr-image`);
      setQr(data);
      setError(null);
      setCountdown(data.rotationSeconds);
    } catch (err: any) {
      setError(err?.message ?? "Could not load QR code");
    }
  }, [eventId]);

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
          return qr.rotationSeconds;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr?.expiresAt, active]);

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
      setError(err instanceof ApiError ? err.message : "Could not update rotation interval");
    } finally {
      setSavingRotation(false);
    }
  }

  if (!active) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-white/40">
          Publish or activate this event to generate its check-in QR code.
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
        <span>Check-in QR</span>
        {qr && <span className="font-mono text-shu-400">refreshing in {countdown}s</span>}
      </CardHeader>
      <CardBody className="flex flex-col items-center gap-4 py-6">
        {error ? (
          <p className="text-sm text-shu-400">{error}</p>
        ) : qr ? (
          <div className="relative rounded-xl border-4 border-white bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.dataUrl} alt="Event check-in QR code" width={260} height={260} />
          </div>
        ) : (
          <div className="h-64 w-64 animate-pulse rounded-xl bg-white/5" />
        )}
        <p className="max-w-xs text-center text-[11px] leading-relaxed text-white/35">
          This code rotates automatically. A screenshot of it goes stale within one rotation window, and every
          scan is still checked against the venue geofence server-side.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={fetchQr}>
            Refresh now
          </Button>
          {editable && (
            <Button variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)}>
              {showSettings ? "Close" : "Change rotation"}
            </Button>
          )}
        </div>

        {editable && showSettings && qr && (
          <div className="w-full border-t border-white/10 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Rotation interval</p>
            <QrRotationInput value={qr.rotationSeconds} onChange={changeRotation} disabled={savingRotation} />
            <p className="mt-2 text-[11px] text-white/35">
              Takes effect on the next refresh — safe to change any time, even while the event is live.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
