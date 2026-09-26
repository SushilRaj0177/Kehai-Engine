"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { SURFACE, SectionHead, MetricStrip, HudTabs } from "@/components/ui/Hud";
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
        <div className="relative mx-auto max-w-lg px-6 py-24">
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
        <div className="relative mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-black text-white">{org.name}</h1>
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
              {overview && overview.events.length > 0 && (
                <section>
                  <SectionHead title={t("orgDetail.trendHeading")} />
                  <div className={`${SURFACE} p-4`}>
                    <OrgAttendanceTrendChart events={overview.events} />
                  </div>
                </section>
              )}

              {events && events.length > 0 && (
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("orgDetail.searchPlaceholder")}
                    className="h-11 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-shu-500/40 focus:outline-none"
                  />
                </div>
              )}

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
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="催" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black text-white md:text-5xl">{org.name}</h1>
            <p className="mt-2 text-base text-white/40">/{org.slug}</p>
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

        {/* --- Desktop (md and up): original full layout --- */}
        <div className="hidden md:block">
          {overview && (
            <div className="relative mt-14 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
              <MiniStat label={t("orgDetail.statEvents")} value={overview.totalEvents} />
              <MiniStat label={t("orgDetail.statCompleted")} value={overview.completedEvents} />
              <MiniStat label={t("orgDetail.statRegistrations")} value={overview.totalRegistrations} />
              <MiniStat label={t("orgDetail.statAttendance")} value={overview.totalAttendance} />
              <MiniStat label={t("orgDetail.statAvgRate")} value={`${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`} />
              <MiniStat label={t("orgDetail.statRecurringRate")} value={`${Math.round((overview.recurringAttendeeRate ?? 0) * 100)}%`} />
            </div>
          )}

          <div className="relative mt-16">
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
            />
          </div>

          <div className="relative mt-16">
            <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("orgMembers.heading")}</h2>
            <Card>
              <CardBody>
                <OrgMembers orgId={org.id} callerRole={org.role} />
              </CardBody>
            </Card>
          </div>

          {isAdmin && (
            <div className="relative mt-16">
              <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("auditLog.heading")}</h2>
              <Card>
                <CardBody>
                  <AuditLogPanel orgId={org.id} />
                </CardBody>
              </Card>
            </div>
          )}

          {isAdmin && (
            <div className="relative mt-16">
              <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("orgDetail.webhookHeading")}</h2>
              <WebhookSection org={org} />
            </div>
          )}

          {org.role === "OWNER" && (
            <div className="relative mt-16">
              <h2 className="mb-6 font-display text-xl font-bold text-shu-400">{t("orgDetail.dangerZoneHeading")}</h2>
              <DeleteOrgSection org={org} />
            </div>
          )}
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
    <Link href={`/orgs/${org.slug}/events/${event.id}`}>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
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
    <Link href={`/orgs/${org.slug}/events/${event.id}`} className="flex items-center gap-3 px-4 py-3.5">
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

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
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
