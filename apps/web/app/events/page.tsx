"use client";

import { useMemo, useState } from "react";
import { Link } from "next-view-transitions";
import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { usePublicEvents } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { useIsStandalone } from "@/lib/useStandalone";
import { SearchIcon, SURFACE } from "@/components/ui/Hud";
import type { EventSummary } from "@/lib/types";

type StatusFilter = "all" | "ACTIVE" | "PUBLISHED";
const FILTERS = ["all", "ACTIVE", "PUBLISHED"] as const;

export default function DiscoverEventsPage() {
  const { t, locale } = useLocale();
  const { data: events, isLoading } = usePublicEvents();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const isStandalone = useIsStandalone();

  const filtered = useMemo(() => {
    if (!events) return events;
    const needle = q.trim().toLowerCase();
    return events.filter((event) => {
      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        event.name.toLowerCase().includes(needle) ||
        event.venue.toLowerCase().includes(needle) ||
        (event.organization?.name.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [events, q, statusFilter]);

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="page-stagger relative mx-auto max-w-2xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <h1 className="font-display text-[26px] font-black leading-tight text-white">{t("eventDiscover.title")}</h1>

          {events && events.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("eventDiscover.searchPlaceholder")}
                  className="h-11 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-shu-500/40 focus:outline-none"
                />
              </div>
              <div className="scroll-thin -mx-5 flex gap-2 overflow-x-auto px-5">
                {FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                      statusFilter === s
                        ? "border-kehai-500/40 bg-kehai-500/10 text-kehai-300"
                        : "border-white/10 bg-white/[0.03] text-white/45"
                    }`}
                  >
                    {s === "all" ? t("eventDiscover.filterAll") : t(`badge.status.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {isLoading ? (
              <LoadingBlock />
            ) : !events?.length ? (
              <EmptyState glyph="無" title={t("eventDiscover.emptyTitle")} description={t("eventDiscover.emptyDescription")} />
            ) : !filtered?.length ? (
              <EmptyState glyph="無" title={t("eventDiscover.noMatchTitle")} description={t("eventDiscover.noMatchDescription")} />
            ) : (
              filtered.map((event) => <EventDiscoverCard key={event.id} event={event} locale={locale} t={t} />)
            )}
          </div>
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="page-stagger relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="催事" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />
        {/* z-20 on every following block here -- above KanjiMark's own
            hardcoded z-10; see orgs/[slug]/page.tsx. */}
        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("eventDiscover.kicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("eventDiscover.title")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          {t("eventDiscover.subtitle")}
        </p>

        {events && events.length > 0 && (
          <div className="relative z-20 mt-10 flex flex-wrap items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("eventDiscover.searchPlaceholder")}
              underline={false}
              className="max-w-xs"
            />
            <div className="flex gap-1.5">
              {FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60 ${
                    statusFilter === s
                      ? "border-kehai-500/40 bg-kehai-500/10 text-kehai-300"
                      : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                  }`}
                >
                  {s === "all" ? t("eventDiscover.filterAll") : t(`badge.status.${s}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative mt-6">
          {isLoading ? (
            <LoadingBlock />
          ) : !events?.length ? (
            <EmptyState glyph="無" title={t("eventDiscover.emptyTitle")} description={t("eventDiscover.emptyDescription")} />
          ) : !filtered?.length ? (
            <EmptyState glyph="無" title={t("eventDiscover.noMatchTitle")} description={t("eventDiscover.noMatchDescription")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-base font-bold leading-snug text-white">{event.name}</h3>
                          <Badge status={event.status}>{t(`badge.status.${event.status}`)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-white/40">{event.organization?.name}</p>
                        <p className="mt-3 text-sm text-white/50">{formatDateRange(event.startsAt, event.endsAt, locale)}</p>
                        <p className="mt-1 text-sm text-white/35">{event.venue}</p>
                        {event.capacity && (
                          <p className="mt-3 text-sm text-white/40">
                            {t("eventDiscover.registeredOf", { count: event._count.registrations, capacity: event.capacity })}
                          </p>
                        )}
                      </CardBody>
                    </Card>
                  </TiltCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClickRippleLayer>
  );
}

// The mockup's Discover card, ported with real data only -- no fabricated
// attendee avatars (EventSummary carries just a registrations count, not
// per-registrant identities), so the "who's going" cue is the real
// isRegistered-driven pill (Going vs RSVP) rather than invented faces.
function EventDiscoverCard({
  event,
  locale,
  t,
}: {
  event: EventSummary;
  locale: "en" | "ja";
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const start = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { day: "2-digit" }).format(start);
  const month = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { month: "short" }).format(start).toUpperCase();
  const time = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { hour: "numeric", minute: "2-digit" }).format(start);

  return (
    <Link href={`/events/${event.id}`} className={`tap-row ${SURFACE} flex gap-3 p-3.5`}>
      <div className="flex h-[54px] w-[50px] shrink-0 flex-col items-center justify-center rounded-[14px] border border-shu-500/30 bg-shu-500/10">
        <span className="font-mono text-[18px] font-black leading-none text-shu-300">{day}</span>
        <span className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-shu-300/60">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        {event.organization?.name && (
          <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-kehai-300/70">{event.organization.name}</p>
        )}
        <p className="mt-0.5 truncate text-[14.5px] font-bold text-white">{event.name}</p>
        <p className="mt-1 font-mono text-[10.5px] text-white/40">
          {time} · {event.venue}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          {event.capacity && (
            <span className="font-mono text-[10px] text-white/30">
              {t("eventDiscover.registeredOf", { count: event._count.registrations, capacity: event.capacity })}
            </span>
          )}
          <span
            className={`ml-auto rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${
              event.isRegistered
                ? "border-kehai-500/40 bg-kehai-500/10 text-kehai-300"
                : "border-white/[0.14] text-white/60"
            }`}
          >
            {event.isRegistered ? t("eventDiscover.going") : t("eventDiscover.rsvp")}
          </span>
        </div>
      </div>
    </Link>
  );
}

