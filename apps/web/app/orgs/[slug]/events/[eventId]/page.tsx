"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { LiveQrPanel } from "@/components/LiveQrPanel";
import { ArrivalTimelineChart } from "@/components/charts/ArrivalTimelineChart";
import { AttendeeTable } from "@/components/AttendeeTable";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { ExportButtons } from "@/components/ExportButtons";
import { useEvent, useEventAnalytics, useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { subscribeToEvent } from "@/lib/realtime";
import type { EventStatus } from "@/lib/types";

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export default function EventControlRoomPage() {
  const { slug, eventId } = useParams<{ slug: string; eventId: string }>();
  const { data: orgs } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);

  const { data: event, isLoading, mutate } = useEvent(eventId);
  const { data: analytics, mutate: mutateAnalytics } = useEventAnalytics(eventId);

  const [liveConnected, setLiveConnected] = useState(false);
  const [liveCount, setLiveCount] = useState<{ attendance: number; registrations: number; rate: number } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    const unsubscribe = subscribeToEvent(eventId, {
      onConnectionChange: setLiveConnected,
      onUpdate: (payload) => {
        setLiveCount({
          attendance: payload.totalAttendance,
          registrations: payload.totalRegistrations,
          rate: payload.attendanceRate,
        });
        void mutate();
        void mutateAnalytics();
      },
    });
    return unsubscribe;
  }, [eventId, mutate, mutateAnalytics]);

  async function transition(next: EventStatus) {
    setStatusError(null);
    setTransitioning(true);
    try {
      await apiFetch(`/api/events/${eventId}/status`, { method: "POST", body: JSON.stringify({ status: next }) });
      await mutate();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : "Failed to update event status");
    } finally {
      setTransitioning(false);
    }
  }

  if (isLoading || !event) return <LoadingBlock label="Loading event…" />;

  const attendance = liveCount?.attendance ?? analytics?.attendance ?? event._count.attendances;
  const registrations = liveCount?.registrations ?? analytics?.registrations ?? event._count.registrations;
  const rate = registrations > 0 ? attendance / registrations : 0;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <KanjiMark glyph="現場" className="absolute -right-6 top-0 text-[9rem]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Badge status={event.status}>{event.status}</Badge>
              <span className={`flex items-center gap-1.5 text-xs ${liveConnected ? "text-emerald-400" : "text-white/30"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${liveConnected ? "bg-emerald-400 animate-pulseGlow" : "bg-white/30"}`} />
                {liveConnected ? "live" : "polling"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-black text-white md:text-4xl">{event.name}</h1>
            <p className="mt-2 text-base text-white/45">
              {formatDateRange(event.startsAt, event.endsAt)} · {event.venue}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {TRANSITIONS[event.status].map((next) => (
              <Button
                key={next}
                variant={next === "CANCELLED" ? "danger" : next === "ACTIVE" ? "primary" : "secondary"}
                size="sm"
                loading={transitioning}
                onClick={() => transition(next)}
              >
                {labelFor(next)}
              </Button>
            ))}
            {org && <ExportButtons eventId={event.id} />}
          </div>
        </div>
        {statusError && <ErrorBlock message={statusError} className="relative mt-3" />}

        <div className="relative mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
          <StatTile label="Registrations" value={registrations} />
          <StatTile label="Attendance" value={attendance} accent="shu" />
          <StatTile label="Attendance rate" value={`${Math.round(rate * 100)}%`} accent="cyan" />
          <StatTile label="No-show rate" value={`${Math.round((analytics?.noShowRate ?? (1 - rate)) * 100)}%`} />
        </div>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">Arrival timeline</CardHeader>
              <CardBody>
                {analytics ? <ArrivalTimelineChart data={analytics.arrivalTimeline} /> : <LoadingBlock />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">Attendees</CardHeader>
              <CardBody>
                <AttendeeTable eventId={event.id} />
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <LiveQrPanel
              eventId={event.id}
              active={event.status === "PUBLISHED" || event.status === "ACTIVE"}
              editable={!!org}
            />
            {org && <AiInsightsPanel eventId={event.id} orgId={org.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFor(status: EventStatus): string {
  switch (status) {
    case "PUBLISHED":
      return "Publish";
    case "ACTIVE":
      return "Go live";
    case "COMPLETED":
      return "Mark completed";
    case "CANCELLED":
      return "Cancel";
    default:
      return status;
  }
}

function StatTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "shu" | "cyan" }) {
  return (
    <div>
      <div
        className={`font-display text-3xl font-bold md:text-4xl ${
          accent === "shu" ? "text-shu-400" : accent === "cyan" ? "text-kehai-400" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
