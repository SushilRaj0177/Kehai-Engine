"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

type StatusFilter = "all" | "ACTIVE" | "PUBLISHED";

export default function DiscoverEventsPage() {
  const { t, locale } = useLocale();
  const { data: events, isLoading } = usePublicEvents();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="催事" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />
        <span className="relative text-xs font-semibold uppercase tracking-widest text-shu-400">{t("eventDiscover.kicker")}</span>
        <h1 className="relative mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("eventDiscover.title")}</h1>
        <p className="relative mt-3 text-lg text-white/50">
          {t("eventDiscover.subtitle")}
        </p>

        {events && events.length > 0 && (
          <div className="relative mt-10 flex flex-wrap items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("eventDiscover.searchPlaceholder")}
              underline={false}
              className="max-w-xs"
            />
            <div className="flex gap-1.5">
              {(["all", "ACTIVE", "PUBLISHED"] as const).map((s) => (
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
