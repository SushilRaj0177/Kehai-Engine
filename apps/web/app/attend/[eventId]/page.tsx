"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { QrScanner } from "@/components/QrScanner";
import { SURFACE } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";
import { useAuth } from "@/lib/auth-context";
import { useEvent } from "@/lib/hooks";
import { apiFetchWithRetry, ApiError } from "@/lib/api";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

type Step = "scan" | "locate" | "confirm" | "done" | "error";

export default function AttendPage() {
  const { t, locale } = useLocale();
  const { eventId } = useParams<{ eventId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: event } = useEvent(eventId);
  const isStandalone = useIsStandalone();

  const checkInWindow = event ? getCheckInWindow(event) : null;

  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [result, setResult] = useState<{ distanceMeters: number; confidence: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number; max: number } | null>(null);

  useEffect(() => {
    const t = search.get("t");
    if (t) {
      setToken(t);
      setStep("locate");
    }
  }, [search]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=/attend/${eventId}`);
    }
  }, [authLoading, user, router, eventId]);

  function handleDecoded(data: string) {
    try {
      const url = new URL(data);
      const t = url.searchParams.get("t");
      if (!t) throw new Error("no token");
      setToken(t);
      setStep("locate");
    } catch {
      setError(t("attend.invalidQr"));
    }
  }

  function requestLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError(t("attend.geoUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setStep("confirm");
      },
      (err) => setError(t("attend.locationError", { message: err.message })),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function submitCheckIn() {
    if (!token || !position) return;
    setSubmitting(true);
    setError(null);
    setRetryStatus(null);
    try {
      const res = await apiFetchWithRetry<{ distanceMeters: number; confidence: string }>(
        `/api/attendance/${eventId}/checkin`,
        {
          method: "POST",
          body: JSON.stringify({
            qrToken: token,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        },
        { onRetry: (attempt, max) => setRetryStatus({ attempt, max }) }
      );
      setResult(res);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === "OUTSIDE_GEOFENCE" && err.details) {
          const d = err.details as { distanceMeters: number };
          setResult({ distanceMeters: d.distanceMeters, confidence: "n/a" });
        }
        // An invalid/expired QR can't be fixed by retrying the same
        // check-in — the token itself is dead, so send the attendee back
        // to actually scan the current code rather than re-confirm a
        // location against a token that will fail again either way.
        setStep(err.code === "INVALID_QR" ? "scan" : "error");
      } else {
        // A network failure (never got a real answer from the server, even
        // after retrying) shouldn't discard the location fix already
        // captured or force a re-scan — stay right here so "try again"
        // is one tap, not the whole flow over again.
        setError(t("attend.connectionFailed"));
      }
    } finally {
      setRetryStatus(null);
      setSubmitting(false);
    }
  }

  if (authLoading) return <LoadingBlock />;

  if (isStandalone) {
    const steps: Step[] = ["scan", "locate", "confirm", "done"];
    const stepIndex = step === "error" ? steps.indexOf("confirm") : steps.indexOf(step);

    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-md px-5 pb-28 pt-6 sm:px-6 sm:pt-8">
          <h1 className="truncate text-center font-display text-[26px] font-black leading-tight text-white">
            {event?.name ?? t("attend.defaultTitle")}
          </h1>

          {(!checkInWindow || checkInWindow.status === "open") && (
            <div className="mx-auto mt-5 flex max-w-[220px] items-center justify-between">
              {steps.map((s, i) => (
                <div key={s} className="flex flex-1 items-center">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                      i <= stepIndex ? "bg-kehai-400" : "bg-white/15"
                    }`}
                  />
                  {i < steps.length - 1 && (
                    <span className={`mx-1 h-px flex-1 transition-colors ${i < stepIndex ? "bg-kehai-400" : "bg-white/15"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            {checkInWindow && checkInWindow.status !== "open" ? (
              <div className={`${SURFACE} border-amber-400/25 p-6 text-center`}>
                <p className="font-display text-base font-bold text-white">
                  {checkInWindow.status === "not_open" ? t("attend.windowNotOpenTitle") : t("attend.windowClosedTitle")}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {checkInWindow.status === "not_open"
                    ? t("attend.windowNotOpenBody", { time: formatDateTime(checkInWindow.opensAt, locale) })
                    : t("attend.windowClosedBody", { time: formatDateTime(checkInWindow.closesAt, locale) })}
                </p>
              </div>
            ) : (
              <>
                {step === "scan" && (
                  <div className="space-y-4 text-center">
                    <QrScanner onDecoded={handleDecoded} />
                    <p className="font-mono text-[11px] uppercase tracking-wider text-white/35">{t("attend.scanHint")}</p>
                    {error && <ErrorBlock message={error} />}
                  </div>
                )}

                {step === "locate" && (
                  <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                    <p className="text-[14px] text-white/60">{t("attend.locateHint")}</p>
                    {error && <ErrorBlock message={error} />}
                    <Button onClick={requestLocation} variant="cyan" className="w-full">
                      {t("attend.shareLocation")}
                    </Button>
                  </div>
                )}

                {step === "confirm" && position && (
                  <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                    <p className="text-[14px] text-white/60">
                      {t("attend.confirmHint", { accuracy: Math.round(position.coords.accuracy) })}
                    </p>
                    {retryStatus && (
                      <p className="font-mono text-[11px] uppercase tracking-wide text-amber-300">
                        {t("attend.reconnecting", { attempt: retryStatus.attempt, max: retryStatus.max })}
                      </p>
                    )}
                    {error && <ErrorBlock message={error} />}
                    <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                      {error ? t("common.tryAgain") : t("attend.confirmAttendance")}
                    </Button>
                  </div>
                )}

                {step === "done" && result && (
                  <div className={`${SURFACE} border-kehai-500/25 p-8 text-center`}>
                    <div
                      className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-kehai-400 text-2xl text-kehai-300"
                      style={{ filter: "drop-shadow(0 0 10px rgba(95,244,255,0.5))" }}
                    >
                      ✓
                    </div>
                    <p className="font-display text-lg font-bold text-white">{t("attend.attendanceConfirmed")}</p>
                    <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-white/40">
                      {t("attend.distanceFromVenue", { distance: Math.round(result.distanceMeters), confidence: result.confidence })}
                    </p>
                  </div>
                )}

                {step === "error" && (
                  <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                    {error && <ErrorBlock message={error} />}
                    {result && (
                      <p className="text-[13px] text-white/50">
                        {t("attend.distanceTooFar", { distance: Math.round(result.distanceMeters) })}
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        setStep("locate");
                        setError(null);
                      }}
                    >
                      {t("common.tryAgain")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-lg px-6 py-16 text-center">
        <KanjiMark glyph="確認" className="absolute -right-4 top-0 text-[4rem] sm:text-[7rem]" />
        <h1 className="relative z-20 font-display text-2xl font-black text-white md:text-3xl">{event?.name ?? t("attend.defaultTitle")}</h1>
        <p className="relative z-20 mt-2 text-base text-white/45">{t("attend.subheading")}</p>

        <div className="relative z-20 mt-10">
          {checkInWindow && checkInWindow.status !== "open" ? (
            <Card className="border-amber-400/30">
              <CardBody className="py-8">
                <p className="font-display text-lg font-semibold text-white">
                  {checkInWindow.status === "not_open" ? t("attend.windowNotOpenTitle") : t("attend.windowClosedTitle")}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {checkInWindow.status === "not_open"
                    ? t("attend.windowNotOpenBody", { time: formatDateTime(checkInWindow.opensAt, locale) })
                    : t("attend.windowClosedBody", { time: formatDateTime(checkInWindow.closesAt, locale) })}
                </p>
              </CardBody>
            </Card>
          ) : (
            <>
          {step === "scan" && (
            <div className="space-y-4">
              <QrScanner onDecoded={handleDecoded} />
              <p className="text-xs text-white/35">{t("attend.scanHint")}</p>
              {error && <ErrorBlock message={error} />}
            </div>
          )}

          {step === "locate" && (
            <Card>
              <CardBody className="space-y-4 py-10">
                <p className="text-sm text-white/60">{t("attend.locateHint")}</p>
                {error && <ErrorBlock message={error} />}
                <Button onClick={requestLocation} variant="cyan">
                  {t("attend.shareLocation")}
                </Button>
              </CardBody>
            </Card>
          )}

          {step === "confirm" && position && (
            <Card>
              <CardBody className="space-y-4 py-8">
                <p className="text-sm text-white/60">
                  {t("attend.confirmHint", { accuracy: Math.round(position.coords.accuracy) })}
                </p>
                {retryStatus && (
                  <p className="text-xs text-amber-300">
                    {t("attend.reconnecting", { attempt: retryStatus.attempt, max: retryStatus.max })}
                  </p>
                )}
                {error && <ErrorBlock message={error} />}
                <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                  {error ? t("common.tryAgain") : t("attend.confirmAttendance")}
                </Button>
              </CardBody>
            </Card>
          )}

          {step === "done" && result && (
            <Card className="border-emerald-500/30">
              <CardBody className="py-10">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-400">
                  ✓
                </div>
                <p className="font-display text-lg font-semibold text-white">{t("attend.attendanceConfirmed")}</p>
                <p className="mt-2 text-sm text-white/50">
                  {t("attend.distanceFromVenue", { distance: Math.round(result.distanceMeters), confidence: result.confidence })}
                </p>
              </CardBody>
            </Card>
          )}

          {step === "error" && (
            <div className="space-y-4">
              {error && <ErrorBlock message={error} />}
              {result && (
                <p className="text-sm text-white/50">
                  {t("attend.distanceTooFar", { distance: Math.round(result.distanceMeters) })}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("locate");
                  setError(null);
                }}
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          )}

            </>
          )}
        </div>
      </div>
    </ClickRippleLayer>
  );
}
