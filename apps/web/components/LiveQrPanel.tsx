"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";

interface QrResponse {
  dataUrl: string;
  expiresAt: string;
  rotationSeconds: number;
}

export function LiveQrPanel({ eventId, active }: { eventId: string; active: boolean }) {
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
        <Button variant="ghost" size="sm" onClick={fetchQr}>
          Refresh now
        </Button>
      </CardBody>
    </Card>
  );
}
