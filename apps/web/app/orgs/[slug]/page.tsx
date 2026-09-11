"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { OrgAttendanceTrendChart } from "@/components/charts/OrgAttendanceTrendChart";
import { OrgMembers } from "@/components/OrgMembers";
import { useMyOrganizations, useOrgEvents, useOrgOverview } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

export default function OrgPage() {
  const { t, locale } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs, isLoading: orgsLoading } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);

  const { data: events, isLoading: eventsLoading } = useOrgEvents(org?.id);
  const { data: overview } = useOrgOverview(org?.id);
  const [q, setQ] = useState("");

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

        {overview && overview.events.length > 0 && (
          <Card className="relative mt-10">
            <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t("orgDetail.trendHeading")}
            </CardHeader>
            <CardBody>
              <OrgAttendanceTrendChart events={overview.events} />
            </CardBody>
          </Card>
        )}

        <div className="relative mt-16">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-white/70">{t("orgDetail.eventsHeading")}</h2>
            {events && events.length > 0 && (
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("orgDetail.searchPlaceholder")}
                underline={false}
                className="max-w-xs"
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <Link key={event.id} href={`/orgs/${org.slug}/events/${event.id}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
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
                  </TiltCard>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative mt-16">
          <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("orgMembers.heading")}</h2>
          <Card>
            <CardBody>
              <OrgMembers orgId={org.id} callerRole={org.role} />
            </CardBody>
          </Card>
        </div>
      </div>
    </ClickRippleLayer>
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
