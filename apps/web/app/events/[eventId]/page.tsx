"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { useAuth } from "@/lib/auth-context";
import { useEvent } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

const EventMap = dynamic(() => import("@/components/EventMap").then((m) => m.EventMap), { ssr: false });

export default function EventDetailPage() {
  const { t, locale } = useLocale();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data: event, isLoading, mutate } = useEvent(eventId);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  if (isLoading || !event) return <LoadingBlock label={t("states.loadingEvent")} />;

  async function register() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError(null);
    setRegistering(true);
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: "POST" });
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("eventDetail.registrationFailed"));
    } finally {
      setRegistering(false);
    }
  }

  const isOpen = event.status === "PUBLISHED" || event.status === "ACTIVE";

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="詳細" className="absolute -right-6 top-0 text-[5rem] sm:text-[9rem]" />

        <div className="relative z-20 flex items-center gap-2.5">
          <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
          <span className="text-sm text-white/40">{event.organization?.name}</span>
        </div>
        <h1 className="relative z-20 mt-4 font-display text-4xl font-black leading-tight text-white md:text-5xl">
          {event.name}
        </h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          {formatDateRange(event.startsAt, event.endsAt, locale)} · {event.venue}
        </p>

        {event.description && <p className="relative z-20 mt-5 text-base leading-relaxed text-white/60">{event.description}</p>}

        {error && <ErrorBlock message={error} className="relative z-20 mt-5" />}

        <div className="relative z-20 mt-8 flex flex-wrap items-center gap-4">
          {event.hasAttended ? (
            <Badge status="COMPLETED">{t("badge.attendanceConfirmed")}</Badge>
          ) : event.isRegistered ? (
            isOpen ? (
              <Link href={`/attend/${event.id}`}>
                <Button variant="cyan" size="lg">
                  {t("eventDetail.checkInWithQr")}
                </Button>
              </Link>
            ) : (
              <Badge>{t("badge.registered")}</Badge>
            )
          ) : isOpen ? (
            <Button size="lg" onClick={register} loading={registering}>
              {t("eventDetail.registerToAttend")}
            </Button>
          ) : (
            <Badge>{t("badge.registrationClosed")}</Badge>
          )}
          <span className="text-sm text-white/35">
            {event.capacity
              ? t("eventDetail.registeredWithCapacity", { count: event._count.registrations, capacity: event.capacity })
              : t("eventDetail.registeredCount", { count: event._count.registrations })}{" "}
            · {t("eventDetail.attendedCount", { count: event._count.attendances })}
          </span>
        </div>

        <Card className="relative z-20 mt-10">
          <CardBody className="py-6">
            <EventMap latitude={event.latitude} longitude={event.longitude} radiusM={event.geofenceRadiusM} />
            <p className="mt-4 text-sm text-white/35">
              {t("eventDetail.geofenceNote", { radius: event.geofenceRadiusM })}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
