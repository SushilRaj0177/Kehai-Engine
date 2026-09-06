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
import { useAuth } from "@/lib/auth-context";
import { useEvent } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange } from "@/lib/format";

const EventMap = dynamic(() => import("@/components/EventMap").then((m) => m.EventMap), { ssr: false });

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { data: event, isLoading, mutate } = useEvent(eventId);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  if (isLoading || !event) return <LoadingBlock label="Loading event…" />;

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
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setRegistering(false);
    }
  }

  const isOpen = event.status === "PUBLISHED" || event.status === "ACTIVE";

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="詳細" className="absolute -right-6 top-0 text-[9rem]" />

        <div className="relative flex items-center gap-2.5">
          <Badge status={event.status}>{event.status}</Badge>
          <span className="text-sm text-white/40">{event.organization?.name}</span>
        </div>
        <h1 className="relative mt-4 font-display text-4xl font-black leading-tight text-white md:text-5xl">
          {event.name}
        </h1>
        <p className="relative mt-3 text-lg text-white/50">
          {formatDateRange(event.startsAt, event.endsAt)} · {event.venue}
        </p>

        {event.description && <p className="relative mt-5 text-base leading-relaxed text-white/60">{event.description}</p>}

        {error && <ErrorBlock message={error} className="relative mt-5" />}

        <div className="relative mt-8 flex flex-wrap items-center gap-4">
          {event.hasAttended ? (
            <Badge status="COMPLETED">Attendance confirmed</Badge>
          ) : event.isRegistered ? (
            isOpen ? (
              <Link href={`/attend/${event.id}`}>
                <Button variant="cyan" size="lg">
                  Check in with QR
                </Button>
              </Link>
            ) : (
              <Badge>Registered</Badge>
            )
          ) : isOpen ? (
            <Button size="lg" onClick={register} loading={registering}>
              Register to attend
            </Button>
          ) : (
            <Badge>Registration closed</Badge>
          )}
          <span className="text-sm text-white/35">
            {event._count.registrations} registered{event.capacity ? ` / ${event.capacity} capacity` : ""} · {event._count.attendances} attended
          </span>
        </div>

        <Card className="relative mt-10">
          <CardBody className="py-6">
            <EventMap latitude={event.latitude} longitude={event.longitude} radiusM={event.geofenceRadiusM} />
            <p className="mt-4 text-sm text-white/35">
              You must be within ~{event.geofenceRadiusM}m of this location (plus your device&apos;s GPS margin) to check in.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
