"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/ui/States";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { LiveQrPanel } from "@/components/LiveQrPanel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ArrivalTimelineChart } from "@/components/charts/ArrivalTimelineChart";
import { AttendeeTable } from "@/components/AttendeeTable";
import { AiInsightsPanel } from "@/components/AiInsightsPanel";
import { ExportButtons } from "@/components/ExportButtons";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { useEvent, useEventAnalytics, useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange, formatDateTime, toLocalDatetimeInputValue } from "@/lib/format";
import { subscribeToEvent } from "@/lib/realtime";
import { getCheckInWindow } from "@/lib/checkin-window";
import type { EventStatus, EventSummary } from "@/lib/types";
import { useLocale } from "@/lib/i18n";

// Same convention as the "restart" and event-creation flows — the
// endsAt column stays non-nullable, so "no fixed end time" is
// represented as a far-future date rather than a real null.
const OPEN_ENDED_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;
const OPEN_ENDED_THRESHOLD_MS = 300 * 24 * 60 * 60 * 1000;

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ACTIVE", "CANCELLED"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["ACTIVE"],
  CANCELLED: ["DRAFT"],
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
  const [extending, setExtending] = useState(false);

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

  // A closed check-in window on an otherwise-live event has no "restart"
  // to reach for (restart only applies once an event is COMPLETED or
  // CANCELLED) — the actual fix is pushing the window forward, so this
  // offers that directly instead of making the organizer go edit the
  // event's end time by hand.
  async function extendWindow(minutes: number) {
    if (!event) return;
    setStatusError(null);
    setExtending(true);
    try {
      const newEndsAt = new Date(new Date(event.endsAt).getTime() + minutes * 60_000).toISOString();
      await apiFetch(`/api/events/${eventId}`, { method: "PATCH", body: JSON.stringify({ endsAt: newEndsAt }) });
      await mutate();
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : t("eventControl.extendError"));
    } finally {
      setExtending(false);
    }
  }

  if (isLoading) return <LoadingBlock label={t("states.loadingEvent")} />;

  if (eventError || !event) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState title={t("eventDetail.notFoundTitle")} description={t("eventDetail.notFoundDescription")} />
        </div>
      </ClickRippleLayer>
    );
  }

  const attendance = liveCount?.attendance ?? analytics?.attendance ?? event._count.attendances;
  const registrations = liveCount?.registrations ?? analytics?.registrations ?? event._count.registrations;
  const rate = registrations > 0 ? Math.min(1, attendance / registrations) : 0;

  const checkInWindow = getCheckInWindow(event);
  const showWindowWarning = (event.status === "ACTIVE" || event.status === "PUBLISHED") && checkInWindow.status !== "open";

  return (
    <ClickRippleLayer className="relative min-h-screen">
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
                {labelFor(event.status, next, t)}
              </Button>
            ))}
            {org && <ExportButtons eventId={event.id} />}
            {org && (
              <Link href={`/orgs/${org.slug}/events/new?from=${event.id}`}>
                <Button variant="secondary" size="sm">
                  {t("eventControl.duplicate")}
                </Button>
              </Link>
            )}
          </div>
        </div>
        {statusError && <ErrorBlock message={statusError} className="relative mt-3" />}

        {org && event.status !== "COMPLETED" && event.status !== "CANCELLED" && (
          <div className="relative z-20 mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <EditTimingPanel event={event} onSaved={() => mutate()} />
              <EditDetailsPanel event={event} onSaved={() => mutate()} />
            </div>
          </div>
        )}

        {showWindowWarning && (
          <div className="relative z-20 mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <p>
              {checkInWindow.status === "not_open"
                ? t("eventControl.windowWarningNotOpen", { time: formatDateTime(checkInWindow.opensAt, locale) })
                : t("eventControl.windowWarningClosed", { time: formatDateTime(checkInWindow.closesAt, locale) })}
            </p>
            {checkInWindow.status === "closed" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-amber-200/60">{t("eventControl.extendPrompt")}</span>
                {[15, 30, 60].map((minutes) => (
                  <Button key={minutes} variant="secondary" size="sm" loading={extending} onClick={() => extendWindow(minutes)}>
                    {t(`eventControl.extendBy${minutes}`)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

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
              eventName={event.name}
            />
            {org && <AiInsightsPanel eventId={event.id} orgId={org.id} />}
          </div>
        </div>
      </div>
    </ClickRippleLayer>
  );
}

function EditTimingPanel({ event, onSaved }: { event: EventSummary; onSaved: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState(() => toLocalDatetimeInputValue(new Date(event.startsAt)));
  const [endsAt, setEndsAt] = useState(() => toLocalDatetimeInputValue(new Date(event.endsAt)));
  const [openEnded, setOpenEnded] = useState(
    () => new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime() > OPEN_ENDED_THRESHOLD_MS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle() {
    setOpen((o) => !o);
    setError(null);
    setSaved(false);
    // Re-sync from the latest server values each time it's opened, so a
    // previous edit (or someone else's, seen via mutate()) isn't stomped.
    setStartsAt(toLocalDatetimeInputValue(new Date(event.startsAt)));
    setEndsAt(toLocalDatetimeInputValue(new Date(event.endsAt)));
    setOpenEnded(new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime() > OPEN_ENDED_THRESHOLD_MS);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const startDate = new Date(startsAt);
      const endDate = openEnded ? new Date(startDate.getTime() + OPEN_ENDED_HORIZON_MS) : new Date(endsAt);
      await apiFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startsAt: startDate.toISOString(), endsAt: endDate.toISOString() }),
      });
      onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("eventControl.editError"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={toggle}>
        {t("eventControl.editTiming")}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-startsAt">{t("eventNew.startsLabel")}</Label>
            <Input id="edit-startsAt" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-endsAt">{t("eventNew.endsLabel")}</Label>
            <Input
              id="edit-endsAt"
              type="datetime-local"
              required={!openEnded}
              disabled={openEnded}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={openEnded}
            onChange={(e) => setOpenEnded(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-kehai-500"
          />
          {t("eventNew.noEndTime")}
        </label>
        {error && <ErrorBlock message={error} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" loading={saving} onClick={save}>
            {t("eventControl.saveChanges")}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggle}>
            {t("common.cancel")}
          </Button>
          {saved && <span className="text-sm text-kehai-400">✓ {t("eventControl.editSaved")}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

// Name, description, venue, capacity were all editable through the API
// (updateEventSchema covers the full create schema) but had no UI at
// all — an organizer with a typo'd venue or a capacity that needs
// bumping had no path short of calling the API directly. Geofence
// lat/long/radius stay out of scope here: editing where check-in is
// physically anchored deserves the map picker the creation form has,
// not a bare number field, and is a bigger, riskier change.
function EditDetailsPanel({ event, onSaved }: { event: EventSummary; onSaved: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description ?? "");
  const [venue, setVenue] = useState(event.venue);
  const [capacity, setCapacity] = useState(event.capacity != null ? String(event.capacity) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle() {
    setOpen((o) => !o);
    setError(null);
    setSaved(false);
    // Re-sync from the latest server values each time it's opened, same
    // reasoning as EditTimingPanel.
    setName(event.name);
    setDescription(event.description ?? "");
    setVenue(event.venue);
    setCapacity(event.capacity != null ? String(event.capacity) : "");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: description.trim() || null,
          venue,
          capacity: capacity.trim() ? Number(capacity) : null,
        }),
      });
      onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("eventControl.editError"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={toggle}>
        {t("eventControl.editDetails")}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardBody className="space-y-4">
        <div>
          <Label htmlFor="edit-name">{t("eventNew.eventNameLabel")}</Label>
          <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-venue">{t("eventNew.venueLabel")}</Label>
          <Input id="edit-venue" required value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-description">{t("eventNew.descriptionLabel")}</Label>
          <Textarea id="edit-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="max-w-[12rem]">
          <Label htmlFor="edit-capacity">{t("eventNew.capacityLabel")}</Label>
          <Input id="edit-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        {error && <ErrorBlock message={error} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" loading={saving} onClick={save}>
            {t("eventControl.saveChanges")}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggle}>
            {t("common.cancel")}
          </Button>
          {saved && <span className="text-sm text-kehai-400">✓ {t("eventControl.editSaved")}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function labelFor(current: EventStatus, next: EventStatus, t: (path: string) => string): string {
  const isRestart = current === "COMPLETED" || current === "CANCELLED";
  if (isRestart) return t("eventControl.transitionRestart");
  switch (next) {
    case "PUBLISHED":
      return t("eventControl.transitionPublish");
    case "ACTIVE":
      return t("eventControl.transitionGoLive");
    case "COMPLETED":
      return t("eventControl.transitionMarkCompleted");
    case "CANCELLED":
      return t("eventControl.transitionCancel");
    default:
      return next;
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
