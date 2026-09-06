"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { QrScanner } from "@/components/QrScanner";
import { useAuth } from "@/lib/auth-context";
import { useClassroom } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

type Step = "scan" | "locate" | "confirm" | "done" | "error";

export default function ClassroomCheckinPage() {
  const { t } = useLocale();
  const { classroomId } = useParams<{ classroomId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: classroom } = useClassroom(classroomId);

  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [result, setResult] = useState<{ distanceMeters: number | null; confidence: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      const res = await apiFetch<{ distanceMeters: number | null; confidence: string | null }>(
        `/api/classrooms/${classroomId}/checkin`,
        {
          method: "POST",
          body: JSON.stringify({
            qrToken: token,
            latitude: position?.coords.latitude,
            longitude: position?.coords.longitude,
            accuracyMeters: position?.coords.accuracy,
          }),
        }
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
      } else {
        setError(t("classroomCheckin.checkInFailed"));
      }
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <LoadingBlock />;

  return (
    <div className="relative min-h-screen">
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
            </div>
          )}

          {step === "locate" && (
            <Card>
              <CardBody className="py-10">
                <p className="mb-4 text-sm text-white/60">{t("classroomCheckin.locateHint")}</p>
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
                <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                  {t("classroomCheckin.confirmAttendance")}
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

          {error && step !== "error" && <ErrorBlock message={error} className="mt-4" />}
        </div>
      </div>
    </div>
  );
}
