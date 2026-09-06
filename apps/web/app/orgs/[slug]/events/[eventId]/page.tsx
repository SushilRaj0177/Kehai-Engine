"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/ui/States";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { LiveQrPanel } from "@/components/LiveQrPanel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ArrivalTimelineChart } from "@/components/charts/ArrivalTimelineChart";
import { AttendeeTable } from "@/components/AttendeeTable";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { ExportButtons } from "@/components/ExportButtons";
import { useEvent, useEventAnalytics, useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange } from "@/lib/format";
import { subscribeToEvent } from "@/lib/realtime";
import type { EventStatus } from "@/lib/types";
import { useLocale } from "@/lib/i18n";

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export default function EventControlRoomPage() {
  const { t, locale } = useLocale();
  const { slug, eventId } = useParams<{ slug: string; eventId: string }>();
  const { data: orgs } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);

  const { data: event, error: eventError, isLoading, mutate } = useEvent(eventId);
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
      setStatusError(err instanceof ApiError ? err.message : t("eventControl.statusUpdateError"));
    } finally {
      setTransitioning(false);
    }
  }

  if (isLoading) return <LoadingBlock label={t("states.loadingEvent")} />;

  if (eventError || !event) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState title={t("eventDetail.notFoundTitle")} description={t("eventDetail.notFoundDescription")} />
        </div>
      </div>
    );
  }

  const attendance = liveCount?.attendance ?? analytics?.attendance ?? event._count.attendances;
  const registrations = liveCount?.registrations ?? analytics?.registrations ?? event._count.registrations;
  const rate = registrations > 0 ? attendance / registrations : 0;

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <KanjiMark glyph="現場" className="absolute -right-6 top-0 text-[5rem] sm:text-[9rem]" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
              <LiveIndicator connected={liveConnected} />
            </div>
            <h1 className="font-display text-3xl font-black text-white md:text-4xl">{event.name}</h1>
            <p className="mt-2 text-base text-white/45">
              {formatDateRange(event.startsAt, event.endsAt, locale)} · {event.venue}
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
                {labelFor(next, t)}
              </Button>
            ))}
            {org && <ExportButtons eventId={event.id} />}
          </div>
        </div>
        {statusError && <ErrorBlock message={statusError} className="relative mt-3" />}

        <div className="relative mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label={t("eventControl.statRegistrations")} value={registrations} />
          <StatTile label={t("eventControl.statAttendance")} value={attendance} accent="shu" />
          <StatTile label={t("eventControl.statAttendanceRate")} value={`${Math.round(rate * 100)}%`} accent="cyan" ring={rate} />
          <StatTile label={t("eventControl.statNoShowRate")} value={`${Math.round((analytics?.noShowRate ?? (1 - rate)) * 100)}%`} />
        </div>

        <div className="relative mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("eventControl.arrivalTimeline")}</CardHeader>
              <CardBody>
                {analytics ? <ArrivalTimelineChart data={analytics.arrivalTimeline} /> : <LoadingBlock />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("eventControl.attendees")}</CardHeader>
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

function labelFor(status: EventStatus, t: (path: string) => string): string {
  switch (status) {
    case "PUBLISHED":
      return t("eventControl.transitionPublish");
    case "ACTIVE":
      return t("eventControl.transitionGoLive");
    case "COMPLETED":
      return t("eventControl.transitionMarkCompleted");
    case "CANCELLED":
      return t("eventControl.transitionCancel");
    default:
      return status;
  }
}

function StatTile({
  label,
  value,
  accent,
  ring,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "shu" | "cyan";
  /** 0-1 — renders a small glowing progress ring next to the number */
  ring?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-4 backdrop-blur-xl">
      {ring !== undefined && (
        // The ring eats into a narrow mobile tile's width just enough to
        // force the label onto two cramped lines while its sibling tile
        // sits flush on one — the colored percentage already carries the
        // same information, so the ring is a desktop-only flourish here.
        <span className="hidden shrink-0 sm:block">
          <ProgressRing value={ring} size={48} stroke={4} color={accent === "shu" ? "#ff2d55" : "#5ff4ff"} />
        </span>
      )}
      <div className="min-w-0">
        <div
          className={`font-display text-3xl font-bold md:text-4xl ${
            accent === "shu" ? "text-shu-400" : accent === "cyan" ? "text-kehai-400" : "text-white"
          }`}
        >
          {value}
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      </div>
    </div>
  );
}
