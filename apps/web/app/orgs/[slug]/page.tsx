"use client";

import { useMemo, useState } from "react";
import { Link } from "next-view-transitions";
import { useParams } from "next/navigation";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState, LoadingBlock, ErrorBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { OrgAttendanceTrendChart } from "@/components/charts/OrgAttendanceTrendChart";
import { OrgMembers } from "@/components/OrgMembers";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { useMyOrganizations, useOrgEvents, useOrgOverview } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateRange, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { SURFACE, SectionHead, MetricStrip, HudTabs, SearchIcon } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";
import type { EventSummary, Organization, OrgOverview } from "@/lib/types";

type MobileTab = "events" | "team" | "activity" | "settings";

export default function OrgPage() {
  const { t, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs, isLoading: orgsLoading } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);

  const { data: events, isLoading: eventsLoading } = useOrgEvents(org?.id);
  const { data: overview } = useOrgOverview(org?.id);
  const [q, setQ] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("events");
  const isStandalone = useIsStandalone();

  const filteredEvents = useMemo(() => {
    if (!events) return events;
    const needle = q.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((e) => e.name.toLowerCase().includes(needle) || e.venue.toLowerCase().includes(needle));
  }, [events, q]);

  if (orgsLoading) return <LoadingBlock />;
  if (!org) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-12 sm:py-16">
          <EmptyState title={t("orgDetail.notFoundTitle")} description={t("orgDetail.notFoundDescription")} />
        </div>
      </ClickRippleLayer>
    );
  }

  const isAdmin = org.role === "ADMIN" || org.role === "OWNER";

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="page-stagger relative mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="min-w-0">
              <h1 className="truncate font-display text-[26px] font-black leading-tight text-white">{org.name}</h1>
              <p className="mt-0.5 truncate text-[12px] text-white/35">/{org.slug}</p>
            </div>
            <Link href={`/orgs/${org.slug}/events/new`}>
              <Button size="sm">{t("orgDetail.newEvent")}</Button>
            </Link>
          </div>

          {overview && (
            <MetricStrip
              items={[
                { value: overview.totalEvents, label: t("orgDetail.statEvents") },
                { value: overview.totalAttendance, label: t("orgDetail.statAttendance") },
                { value: `${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`, label: t("orgDetail.statAvgRateShort") },
              ]}
            />
          )}

          <HudTabs
            tabs={[
              { id: "events" as const, label: t("orgDetail.eventsHeading") },
              { id: "team" as const, label: t("orgMembers.heading") },
              { id: "activity" as const, label: t("orgDetail.tabActivity") },
              ...(isAdmin ? [{ id: "settings" as const, label: t("orgDetail.tabSettings") }] : []),
            ]}
            active={mobileTab}
            onChange={setMobileTab}
          />

          {mobileTab === "events" && (
            <div className="space-y-6">
              {eventsLoading ? (
                <LoadingBlock />
              ) : !events?.length ? (
                <EmptyState
                  glyph="催"
                  title={t("orgDetail.emptyTitle")}
                  description={t("orgDetail.emptyDescription")}
                  action={
                    <Link href={`/orgs/${org.slug}/events/new`}>
                      <Button size="sm">{t("orgDetail.createEvent")}</Button>
                    </Link>
                  }
                />
              ) : !filteredEvents?.length ? (
                <EmptyState glyph="催" title={t("orgDetail.noMatchTitle")} description={t("orgDetail.noMatchDescription")} />
              ) : (
                <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
                  {filteredEvents.map((event) => (
                    <StandaloneEventRow key={event.id} org={org} event={event} locale={locale} t={t} />
                  ))}
                </div>
              )}

              {overview && overview.events.length > 0 && (
                <section>
                  <SectionHead title={t("orgDetail.trendHeading")} />
                  <div className={`${SURFACE} p-4`}>
                    <OrgAttendanceTrendChart events={overview.events} />
                  </div>
                </section>
              )}
            </div>
          )}

          {mobileTab === "team" && (
            <div className={`${SURFACE} p-4`}>
              <OrgMembers orgId={org.id} callerRole={org.role} />
            </div>
          )}

          {mobileTab === "activity" && (
            <div className={`${SURFACE} p-4`}>
              <AuditLogPanel orgId={org.id} />
            </div>
          )}

          {mobileTab === "settings" && isAdmin && (
            <div className="space-y-6">
              <section>
                <SectionHead title={t("orgDetail.webhookHeading")} />
                <div className={`${SURFACE} space-y-4 p-4`}>
                  <WebhookFields org={org} />
                </div>
              </section>
              {org.role === "OWNER" && (
                <section>
                  <SectionHead title={t("orgDetail.dangerZoneHeading")} accent="text-shu-400" />
                  <div className={`${SURFACE} space-y-4 border-shu-500/20 p-4`}>
                    <DeleteOrgFields org={org} />
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="page-stagger relative mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <KanjiMark glyph="催" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />
        {/* z-20 -- above KanjiMark's own hardcoded z-10. Without it, this
            row (position: relative, z-index: auto) paints *behind* the
            glyph despite coming later in the DOM, since KanjiMark's
            explicit z-index wins over an auto one regardless of order --
            which is exactly what put the "催" watermark visually on top
            of the New Event button. */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-white md:text-4xl">{org.name}</h1>
            <p className="mt-1 text-sm text-white/40">/{org.slug}</p>
          </div>
          <Link href={`/orgs/${org.slug}/events/new`}>
            <Button size="lg">{t("orgDetail.newEvent")}</Button>
          </Link>
        </div>

        {/* --- Mobile / tablet (below md): stat widgets + tabbed sections,
            everything one screen at a time instead of one long stacked
            page — same pattern GitHub, Stripe, and Vercel's own dashboards
            use on small screens. Desktop keeps the original full stacked
            layout below, unchanged, since it never had a scrolling
            problem to begin with. --- */}
        <div className="relative mt-10 md:hidden">
          {overview && (
            // Horizontal scrollable strip, not a 2-column grid: the pattern
            // Robinhood, Coinbase, and Stripe's own mobile dashboards use
            // for a KPI row. Each chip sizes to its own content instead of
            // a shared grid cell, so one longer label can never stretch a
            // whole row and pad out its neighbor (the actual bug in the
            // grid version -- "Avg. attendance rate" wrapping to two lines
            // was inflating "Registrations" next to it to match).
            <div className="scroll-thin -mx-6 flex gap-2.5 overflow-x-auto px-6 pb-1">
              <StatTile label={t("orgDetail.statEvents")} value={overview.totalEvents} />
              <StatTile label={t("orgDetail.statAttendance")} value={overview.totalAttendance} />
              <StatTile label={t("orgDetail.statAvgRateShort")} value={`${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`} />
              <StatTile label={t("orgDetail.statRegistrations")} value={overview.totalRegistrations} />
              <StatTile label={t("orgDetail.statCompleted")} value={overview.completedEvents} />
              <StatTile label={t("orgDetail.statRecurringRateShort")} value={`${Math.round((overview.recurringAttendeeRate ?? 0) * 100)}%`} />
            </div>
          )}

          <MobileTabBar
            active={mobileTab}
            onChange={setMobileTab}
            showSettings={isAdmin}
          />

          <div className="mt-5">
            {mobileTab === "events" && (
              <EventsPanel
                org={org}
                overview={overview}
                events={events}
                eventsLoading={eventsLoading}
                filteredEvents={filteredEvents}
                q={q}
                setQ={setQ}
                locale={locale}
                t={t}
                compact
              />
            )}
            {mobileTab === "team" && (
              <Card>
                <CardBody>
                  <OrgMembers orgId={org.id} callerRole={org.role} />
                </CardBody>
              </Card>
            )}
            {mobileTab === "activity" && (
              <Card>
                <CardBody>
                  <AuditLogPanel orgId={org.id} />
                </CardBody>
              </Card>
            )}
            {mobileTab === "settings" && isAdmin && (
              <div className="space-y-6">
                <WebhookSection org={org} />
                {org.role === "OWNER" && <DeleteOrgSection org={org} />}
              </div>
            )}
          </div>
        </div>

        {/* --- Desktop (md and up): one-screen dashboard. KPIs in a single
            row, the event list as the primary column, and everything
            secondary (trend, team, activity, settings) in a sticky tabbed
            sidebar -- so nothing requires scrolling past something else. --- */}
        <div className="hidden md:block">
          {overview && (
            <div className="relative z-20 mt-8 grid grid-cols-3 gap-3 lg:grid-cols-6">
              <KpiTile label={t("orgDetail.statEvents")} value={overview.totalEvents} />
              <KpiTile label={t("orgDetail.statCompleted")} value={overview.completedEvents} />
              <KpiTile label={t("orgDetail.statRegistrations")} value={overview.totalRegistrations} />
              <KpiTile label={t("orgDetail.statAttendance")} value={overview.totalAttendance} />
              <KpiTile label={t("orgDetail.statAvgRate")} value={`${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`} accent="shu" />
              <KpiTile label={t("orgDetail.statRecurringRate")} value={`${Math.round((overview.recurringAttendeeRate ?? 0) * 100)}%`} accent="kehai" />
            </div>
          )}

          <div className="relative z-20 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <DesktopEventsPanel
              org={org}
              events={events}
              eventsLoading={eventsLoading}
              filteredEvents={filteredEvents}
              q={q}
              setQ={setQ}
              locale={locale}
              t={t}
            />
            <div className="space-y-6 lg:sticky lg:top-24">
              {overview && overview.events.length > 0 && (
                <Card>
                  <CardBody className="py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{t("orgDetail.trendHeading")}</p>
                    <OrgAttendanceTrendChart events={overview.events} />
                  </CardBody>
                </Card>
              )}
              <DesktopSidePanel org={org} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </div>
    </ClickRippleLayer>
  );
}

function MobileTabBar({
  active,
  onChange,
  showSettings,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  showSettings: boolean;
}) {
  const { t } = useLocale();
  const tabs: { id: MobileTab; label: string }[] = [
    { id: "events", label: t("orgDetail.eventsHeading") },
    { id: "team", label: t("orgMembers.heading") },
    { id: "activity", label: t("orgDetail.tabActivity") },
    ...(showSettings ? [{ id: "settings" as const, label: t("orgDetail.tabSettings") }] : []),
  ];

  return (
    <div className="scroll-thin mt-6 flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-colors ${
            active === tab.id
              ? "bg-shu-500 text-void-950"
              : "border border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function EventsPanel({
  org,
  overview,
  events,
  eventsLoading,
  filteredEvents,
  q,
  setQ,
  locale,
  t,
  compact,
}: {
  org: Organization;
  overview: OrgOverview | undefined;
  events: EventSummary[] | undefined;
  eventsLoading: boolean;
  filteredEvents: EventSummary[] | undefined;
  q: string;
  setQ: (v: string) => void;
  locale: "en" | "ja";
  t: (key: string, vars?: Record<string, string | number>) => string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-6">
      {!compact && overview && overview.events.length > 0 && (
        <Card>
          <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {t("orgDetail.trendHeading")}
          </CardHeader>
          <CardBody>
            <OrgAttendanceTrendChart events={overview.events} />
          </CardBody>
        </Card>
      )}
      {compact && overview && overview.events.length > 0 && (
        <Card>
          <CardBody className="py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{t("orgDetail.trendHeading")}</p>
            <OrgAttendanceTrendChart events={overview.events} />
          </CardBody>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {!compact && <h2 className="font-display text-xl font-bold text-white/70">{t("orgDetail.eventsHeading")}</h2>}
        {events && events.length > 0 && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("orgDetail.searchPlaceholder")}
            underline={false}
            className={compact ? "w-full max-w-none" : "max-w-xs"}
          />
        )}
      </div>

      {eventsLoading ? (
        <LoadingBlock />
      ) : !events?.length ? (
        <EmptyState
          glyph="催"
          title={t("orgDetail.emptyTitle")}
          description={t("orgDetail.emptyDescription")}
          action={
            <Link href={`/orgs/${org.slug}/events/new`}>
              <Button>{t("orgDetail.createEvent")}</Button>
            </Link>
          }
        />
      ) : !filteredEvents?.length ? (
        <EmptyState glyph="催" title={t("orgDetail.noMatchTitle")} description={t("orgDetail.noMatchDescription")} />
      ) : (
        <div className={compact ? "space-y-3" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3"}>
          {filteredEvents.map((event) => (
            <EventCard key={event.id} org={org} event={event} locale={locale} t={t} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({
  org,
  event,
  locale,
  t,
  compact,
}: {
  org: Organization;
  event: EventSummary;
  locale: "en" | "ja";
  t: (key: string, vars?: Record<string, string | number>) => string;
  compact?: boolean;
}) {
  const body = (
    <Card className="h-full transition-colors hover:border-shu-500/30">
      <CardBody className={compact ? "relative z-10 py-4" : "relative z-10 py-6"}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-bold leading-snug text-white">{event.name}</h3>
          <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
        </div>
        <p className="mt-2 text-sm text-white/40">{formatDateRange(event.startsAt, event.endsAt, locale)}</p>
        <p className="mt-1 text-sm text-white/35">{event.venue}</p>
        <div className="mt-5 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-sm text-white/50">
          <span>{t("orgDetail.registeredCount", { count: event._count.registrations })}</span>
          <span>{t("orgDetail.attendedCount", { count: event._count.attendances })}</span>
        </div>
      </CardBody>
    </Card>
  );

  // Skip the 3D tilt effect in the compact mobile list -- it's a
  // pointer/hover flourish that adds nothing on a touch device and the
  // list here is denser (stacked rows, not a spaced-out grid) than the
  // tilt effect was designed to sit in.
  return (
    <Link href={`/orgs/${org.slug}/events/${event.id}`} className={compact ? "tap-row block rounded-2xl" : undefined}>
      {compact ? body : <TiltCard className="h-full rounded-2xl">{body}</TiltCard>}
    </Link>
  );
}

function WebhookSection({ org }: { org: NonNullable<ReturnType<typeof useMyOrganizations>["data"]>[number] }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <WebhookFields org={org} />
      </CardBody>
    </Card>
  );
}

function WebhookFields({ org }: { org: NonNullable<ReturnType<typeof useMyOrganizations>["data"]>[number] }) {
  const { t } = useLocale();
  const { mutate } = useMyOrganizations();
  const [url, setUrl] = useState(org.webhookUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await apiFetch(`/api/orgs/${org.id}/webhook`, { method: "PATCH", body: JSON.stringify({ webhookUrl: url.trim() }) });
      await mutate();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("orgDetail.webhookError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        <p className="text-sm font-medium text-white/85">{t("orgDetail.webhookLabel")}</p>
        <p className="mt-1 text-xs text-white/40">{t("orgDetail.webhookHint")}</p>
      </div>
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("orgDetail.webhookPlaceholder")} underline={false} />
      {error && <ErrorBlock message={error} />}
      <div className="flex items-center gap-3">
        <Button size="sm" loading={saving} onClick={save}>
          {t("settings.saveChanges")}
        </Button>
        {saved && <span className="text-sm text-kehai-400">✓ {t("settings.saved")}</span>}
      </div>
    </>
  );
}

function DeleteOrgSection({ org }: { org: NonNullable<ReturnType<typeof useMyOrganizations>["data"]>[number] }) {
  return (
    <Card className="border-shu-500/20">
      <CardBody className="space-y-4">
        <DeleteOrgFields org={org} />
      </CardBody>
    </Card>
  );
}

function DeleteOrgFields({ org }: { org: NonNullable<ReturnType<typeof useMyOrganizations>["data"]>[number] }) {
  const { t } = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setError(null);
    setDeleting(true);
    try {
      await apiFetch(`/api/orgs/${org.id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("orgDetail.deleteOrgError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div>
        <p className="text-sm font-medium text-white/85">{t("orgDetail.deleteOrgLabel")}</p>
        <p className="mt-1 text-xs text-white/40">{t("orgDetail.deleteOrgHint")}</p>
      </div>
      {error && <ErrorBlock message={error} />}
      {confirming ? (
        <div className="space-y-3 rounded-lg border border-shu-500/20 bg-shu-500/5 p-4">
          <div>
            <Label htmlFor="delete-org-confirm">{t("orgDetail.typeNameToConfirm", { name: org.name })}</Label>
            <Input id="delete-org-confirm" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="danger" size="sm" loading={deleting} onClick={confirmDelete} disabled={typedName !== org.name}>
              {t("orgDetail.deleteOrgConfirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setTypedName("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
          {t("orgDetail.deleteOrgLabel")}
        </Button>
      )}
    </>
  );
}


function StandaloneEventRow({
  org,
  event,
  locale,
  t,
}: {
  org: Organization;
  event: EventSummary;
  locale: "en" | "ja";
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Link href={`/orgs/${org.slug}/events/${event.id}`} className="tap-row flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-semibold text-white/85">{event.name}</p>
          <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-white/35">
          {formatDate(event.startsAt, locale)} · {event.venue}
        </p>
      </div>
      <div className="shrink-0 text-right font-mono text-[11px] text-white/40">
        <p>{t("orgDetail.registeredCount", { count: event._count.registrations })}</p>
        <p className="mt-0.5">{t("orgDetail.attendedCount", { count: event._count.attendances })}</p>
      </div>
    </Link>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "shu" | "kehai" }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
      <div
        className={`font-display text-2xl font-bold leading-none ${
          accent === "shu" ? "text-shu-300" : accent === "kehai" ? "text-kehai-300" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 truncate text-[11px] uppercase tracking-wider text-white/40" title={label}>
        {label}
      </div>
    </div>
  );
}

type SideTab = "team" | "activity" | "settings";

function DesktopSidePanel({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  const { t } = useLocale();
  const [tab, setTab] = useState<SideTab>("team");
  const tabs: { id: SideTab; label: string }[] = [
    { id: "team", label: t("orgMembers.heading") },
    ...(isAdmin
      ? [
          { id: "activity" as const, label: t("orgDetail.tabActivity") },
          { id: "settings" as const, label: t("orgDetail.tabSettings") },
        ]
      : []),
  ];
  return (
    <Card>
      <div className="px-5 pt-4">
        <HudTabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
      <CardBody className="scroll-thin max-h-[min(560px,calc(100vh-220px))] overflow-y-auto px-5 py-4">
        {tab === "team" && <OrgMembers orgId={org.id} callerRole={org.role} />}
        {tab === "activity" && isAdmin && <AuditLogPanel orgId={org.id} />}
        {tab === "settings" && isAdmin && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("orgDetail.webhookHeading")}</p>
              <WebhookFields org={org} />
            </div>
            {org.role === "OWNER" && (
              <div className="border-t border-shu-500/20 pt-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-shu-400">{t("orgDetail.dangerZoneHeading")}</p>
                <DeleteOrgFields org={org} />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Desktop event list: dense rows instead of a 3-up card grid, so a dozen
// events fit on one screen with name, status, date, venue and turnout
// scannable in columns.
function DesktopEventsPanel({
  org,
  events,
  eventsLoading,
  filteredEvents,
  q,
  setQ,
  locale,
  t,
}: {
  org: Organization;
  events: EventSummary[] | undefined;
  eventsLoading: boolean;
  filteredEvents: EventSummary[] | undefined;
  q: string;
  setQ: (v: string) => void;
  locale: "en" | "ja";
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-display text-lg font-bold text-white">{t("orgDetail.eventsHeading")}</h2>
          {events && <span className="font-mono text-xs font-bold text-white/35">{events.length}</span>}
        </div>
        {events && events.length > 0 && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("orgDetail.searchPlaceholder")}
            underline={false}
            className="h-9 w-64 max-w-full py-1.5 text-sm"
          />
        )}
      </div>
      {eventsLoading ? (
        <div className="p-6">
          <LoadingBlock />
        </div>
      ) : !events?.length ? (
        <div className="p-6">
          <EmptyState
            glyph="催"
            title={t("orgDetail.emptyTitle")}
            description={t("orgDetail.emptyDescription")}
            action={
              <Link href={`/orgs/${org.slug}/events/new`}>
                <Button>{t("orgDetail.createEvent")}</Button>
              </Link>
            }
          />
        </div>
      ) : !filteredEvents?.length ? (
        <div className="p-6">
          <EmptyState glyph="催" title={t("orgDetail.noMatchTitle")} description={t("orgDetail.noMatchDescription")} />
        </div>
      ) : (
        <ul className="scroll-thin max-h-[min(640px,calc(100vh-260px))] divide-y divide-white/[0.05] overflow-y-auto">
          {filteredEvents.map((event) => {
            const reg = event._count.registrations;
            const att = event._count.attendances;
            const rate = reg > 0 ? Math.min(1, att / reg) : 0;
            return (
              <li key={event.id}>
                <Link
                  href={`/orgs/${org.slug}/events/${event.id}`}
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.03] xl:grid-cols-[minmax(0,1fr)_200px_150px_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate font-semibold text-white transition-colors group-hover:text-shu-300">{event.name}</p>
                      <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-white/40">
                      {event.venue}
                      <span className="xl:hidden"> · {formatDateRange(event.startsAt, event.endsAt, locale)}</span>
                    </p>
                  </div>
                  <p className="hidden truncate text-xs text-white/45 xl:block">{formatDateRange(event.startsAt, event.endsAt, locale)}</p>
                  <div className="hidden xl:block">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-white/80">
                        {att}
                        <span className="text-white/35">/{reg}</span>
                      </span>
                      <span className="font-mono text-[10px] text-white/35">{Math.round(rate * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-gradient-to-r from-shu-500 to-kehai-400" style={{ width: `${rate * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/70" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}


// Compact bordered widget for the mobile stat strip -- a plain
// number+label pair (MiniStat, used on desktop) reads fine spread across
// six columns, but bare in a tight mobile layout it's just floating text.
// A bounded tile is what makes it scannable at a glance. shrink-0 + a
// min-width keep each chip a consistent size in the horizontal scroll
// strip regardless of its own content length.
function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3" style={{ minWidth: "108px" }}>
      <div className="font-display text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 whitespace-nowrap text-[11px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
