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
import { useEvent } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";

type Step = "scan" | "locate" | "confirm" | "done" | "error";

export default function AttendPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: event } = useEvent(eventId);

  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("scan");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [result, setResult] = useState<{ distanceMeters: number; confidence: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError("That QR code doesn't look like a valid Kehai Engine check-in code.");
    }
  }

  function requestLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device/browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setStep("confirm");
      },
      (err) => setError(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function submitCheckIn() {
    if (!token || !position) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ distanceMeters: number; confidence: string }>(`/api/attendance/${eventId}/checkin`, {
        method: "POST",
        body: JSON.stringify({
          qrToken: token,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        }),
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.code === "OUTSIDE_GEOFENCE" && err.details) {
          const d = err.details as { distanceMeters: number };
          setResult({ distanceMeters: d.distanceMeters, confidence: "n/a" });
        }
      } else {
        setError("Check-in failed.");
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
        <h1 className="relative z-20 font-display text-2xl font-black text-white md:text-3xl">{event?.name ?? "Check in"}</h1>
        <p className="relative z-20 mt-2 text-base text-white/45">Verify your presence with QR + location.</p>

        <div className="relative z-20 mt-10">
          {step === "scan" && (
            <div className="space-y-4">
              <QrScanner onDecoded={handleDecoded} />
              <p className="text-xs text-white/35">Point your camera at the organizer&apos;s check-in QR display.</p>
            </div>
          )}

          {step === "locate" && (
            <Card>
              <CardBody className="py-10">
                <p className="mb-4 text-sm text-white/60">QR verified. Now share your location to confirm you&apos;re at the venue.</p>
                <Button onClick={requestLocation} variant="cyan">
                  Share my location
                </Button>
              </CardBody>
            </Card>
          )}

          {step === "confirm" && position && (
            <Card>
              <CardBody className="space-y-4 py-8">
                <p className="text-sm text-white/60">
                  Location captured (±{Math.round(position.coords.accuracy)}m accuracy). Confirm check-in?
                </p>
                <Button onClick={submitCheckIn} loading={submitting} size="lg" className="w-full">
                  Confirm attendance
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
                <p className="font-display text-lg font-semibold text-white">Attendance confirmed</p>
                <p className="mt-2 text-sm text-white/50">
                  You were {Math.round(result.distanceMeters)}m from the venue ({result.confidence} location confidence).
                </p>
              </CardBody>
            </Card>
          )}

          {step === "error" && (
            <div className="space-y-4">
              {error && <ErrorBlock message={error} />}
              {result && (
                <p className="text-sm text-white/50">
                  You appear to be {Math.round(result.distanceMeters)}m from the venue — move closer and try again.
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setStep("locate");
                  setError(null);
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {error && step !== "error" && <ErrorBlock message={error} className="mt-4" />}
        </div>
      </div>
    </div>
  );
}
