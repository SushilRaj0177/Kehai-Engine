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
import { useClassroom } from "@/lib/hooks";
import { apiFetchWithRetry, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Step = "scan" | "locate" | "confirm" | "done" | "error";

export default function ClassroomCheckinPage() {
  const { t } = useLocale();
  const { classroomId } = useParams<{ classroomId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: classroom } = useClassroom(classroomId);
  const isStandalone = useIsStandalone();

  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [result, setResult] = useState<{ distanceMeters: number | null; confidence: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number; max: number } | null>(null);

  const hasGeofence = classroom?.hasGeofence ?? true;

  useEffect(() => {
    const qToken = search.get("t");
    if (qToken) {
      setToken(qToken);
      setStep(hasGeofence ? "locate" : "confirm");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, hasGeofence]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=/classrooms/${classroomId}/checkin`);
    }
  }, [authLoading, user, router, classroomId]);

  function handleDecoded(data: string) {
    let qToken: string | null = null;
    try {
      const url = new URL(data);
      qToken = url.searchParams.get("t");
    } catch {
      qToken = data || null;
    }
    if (!qToken) {
      setError(t("classroomCheckin.invalidQr"));
      return;
    }
    setToken(qToken);
    setStep(hasGeofence ? "locate" : "confirm");
  }

  function requestLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError(t("classroomCheckin.geoUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setStep("confirm");
      },
      (err) => setError(t("classroomCheckin.locationError", { message: err.message })),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function submitCheckIn() {
    if (!token) return;
    if (hasGeofence && !position) return;
    setSubmitting(true);
    setError(null);
    setRetryStatus(null);
    try {
      const res = await apiFetchWithRetry<{ distanceMeters: number | null; confidence: string | null }>(
        `/api/classrooms/${classroomId}/checkin`,
        {
          method: "POST",
          body: JSON.stringify({
            qrToken: token,
            latitude: position?.coords.latitude,
            longitude: position?.coords.longitude,
            accuracyMeters: position?.coords.accuracy,
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
          setResult({ distanceMeters: d.distanceMeters, confidence: null });
        }
        // An invalid/expired QR can't be fixed by retrying the same
        // check-in — send the student back to actually scan the current
        // code instead of re-confirming a location against a dead token.
        setStep(err.code === "INVALID_QR" ? "scan" : "error");
      } else {
        // Network failure even after retrying — stay on "confirm" so the
        // captured location and token are still there and retrying is one
        // tap, not a full re-scan.
        setError(t("classroomCheckin.connectionFailed"));
      }
    } finally {
      setRetryStatus(null);
      setSubmitting(false);
    }
  }

  if (authLoading) return <LoadingBlock />;

  if (isStandalone) {
    const steps: Step[] = hasGeofence ? ["scan", "locate", "confirm", "done"] : ["scan", "confirm", "done"];
    const stepIndex = step === "error" ? steps.indexOf("confirm") : steps.indexOf(step);

    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-md px-5 pb-28 pt-6 sm:px-6 sm:pt-8">
          <h1 className="truncate text-center font-display text-[26px] font-black leading-tight text-white">
            {classroom?.name ?? t("attend.defaultTitle")}
          </h1>
          <p className="mt-1 text-center text-[13px] text-white/40">
            {hasGeofence ? t("classroomCheckin.subheading") : t("classroomCheckin.subheadingNoGeofence")}
          </p>

          <div className="mx-auto mt-5 flex max-w-[220px] items-center justify-between">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${i <= stepIndex ? "bg-kehai-400" : "bg-white/15"}`} />
                {i < steps.length - 1 && (
                  <span className={`mx-1 h-px flex-1 transition-colors ${i < stepIndex ? "bg-kehai-400" : "bg-white/15"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            {step === "scan" && (
              <div className="space-y-4 text-center">
                <QrScanner onDecoded={handleDecoded} />
                <p className="font-mono text-[11px] uppercase tracking-wider text-white/35">{t("classroomCheckin.scanHint")}</p>
                {error && <ErrorBlock message={error} />}
              </div>
            )}

            {step === "locate" && (
              <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                <p className="text-[14px] text-white/60">{t("classroomCheckin.locateHint")}</p>
                {error && <ErrorBlock message={error} />}
                <Button onClick={requestLocation} variant="cyan" className="w-full">
                  {t("classroomCheckin.shareLocation")}
                </Button>
              </div>
            )}

            {step === "confirm" && (
              <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                <p className="text-[14px] text-white/60">
                  {hasGeofence && position
                    ? t("classroomCheckin.confirmHint", { accuracy: Math.round(position.coords.accuracy) })
                    : t("classroomCheckin.confirmHintNoGeofence")}
                </p>
                {retryStatus && (
                  <p className="font-mono text-[11px] uppercase tracking-wide text-amber-300">
                    {t("classroomCheckin.reconnecting", { attempt: retryStatus.attempt, max: retryStatus.max })}
                  </p>
                )}
                {error && <ErrorBlock message={error} />}
                <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                  {error ? t("common.tryAgain") : t("classroomCheckin.confirmAttendance")}
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
                <p className="font-display text-lg font-bold text-white">{t("classroomCheckin.attendanceConfirmed")}</p>
                {result.distanceMeters != null && (
                  <p className="mt-2 font-mono text-[12px] uppercase tracking-wide text-white/40">
                    {t("classroomCheckin.distanceFromClass", {
                      distance: Math.round(result.distanceMeters),
                      confidence: result.confidence ?? "—",
                    })}
                  </p>
                )}
              </div>
            )}

            {step === "error" && (
              <div className={`${SURFACE} space-y-4 p-6 text-center`}>
                {error && <ErrorBlock message={error} />}
                {result?.distanceMeters != null && (
                  <p className="text-[13px] text-white/50">
                    {t("classroomCheckin.distanceTooFar", { distance: Math.round(result.distanceMeters) })}
                  </p>
                )}
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setStep(hasGeofence ? "locate" : "confirm");
                    setError(null);
                  }}
                >
                  {t("common.tryAgain")}
                </Button>
              </div>
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
        <h1 className="relative z-20 font-display text-2xl font-black text-white md:text-3xl">
          {classroom?.name ?? t("attend.defaultTitle")}
        </h1>
        <p className="relative z-20 mt-2 text-base text-white/45">
          {hasGeofence ? t("classroomCheckin.subheading") : t("classroomCheckin.subheadingNoGeofence")}
        </p>

        <div className="relative z-20 mt-10">
          {step === "scan" && (
            <div className="space-y-4">
              <QrScanner onDecoded={handleDecoded} />
              <p className="text-xs text-white/35">{t("classroomCheckin.scanHint")}</p>
              {error && <ErrorBlock message={error} />}
            </div>
          )}

          {step === "locate" && (
            <Card>
              <CardBody className="space-y-4 py-10">
                <p className="text-sm text-white/60">{t("classroomCheckin.locateHint")}</p>
                {error && <ErrorBlock message={error} />}
                <Button onClick={requestLocation} variant="cyan">
                  {t("classroomCheckin.shareLocation")}
                </Button>
              </CardBody>
            </Card>
          )}

          {step === "confirm" && (
            <Card>
              <CardBody className="space-y-4 py-8">
                <p className="text-sm text-white/60">
                  {hasGeofence && position
                    ? t("classroomCheckin.confirmHint", { accuracy: Math.round(position.coords.accuracy) })
                    : t("classroomCheckin.confirmHintNoGeofence")}
                </p>
                {retryStatus && (
                  <p className="text-xs text-amber-300">
                    {t("classroomCheckin.reconnecting", { attempt: retryStatus.attempt, max: retryStatus.max })}
                  </p>
                )}
                {error && <ErrorBlock message={error} />}
                <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                  {error ? t("common.tryAgain") : t("classroomCheckin.confirmAttendance")}
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
                <p className="font-display text-lg font-semibold text-white">{t("classroomCheckin.attendanceConfirmed")}</p>
                {result.distanceMeters != null && (
                  <p className="mt-2 text-sm text-white/50">
                    {t("classroomCheckin.distanceFromClass", {
                      distance: Math.round(result.distanceMeters),
                      confidence: result.confidence ?? "—",
                    })}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {step === "error" && (
            <div className="space-y-4">
              {error && <ErrorBlock message={error} />}
              {result?.distanceMeters != null && (
                <p className="text-sm text-white/50">
                  {t("classroomCheckin.distanceTooFar", { distance: Math.round(result.distanceMeters) })}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setStep(hasGeofence ? "locate" : "confirm");
                  setError(null);
                }}
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </ClickRippleLayer>
  );
}
