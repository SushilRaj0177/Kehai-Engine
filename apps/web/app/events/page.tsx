"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { usePublicEvents } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";

export default function DiscoverEventsPage() {
  const { data: events, isLoading } = usePublicEvents();

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="催事" className="absolute -right-6 top-0 text-[10rem]" />
        <span className="relative text-xs font-semibold uppercase tracking-widest text-shu-400">Live right now</span>
        <h1 className="relative mt-3 font-display text-4xl font-black text-white md:text-5xl">Discover events</h1>
        <p className="relative mt-3 text-lg text-white/50">
          Published and currently active events across all organizations.
        </p>

        <div className="relative mt-14">
          {isLoading ? (
            <LoadingBlock />
          ) : !events?.length ? (
            <EmptyState glyph="無" title="No events published yet" description="Check back soon, or ask an organizer to publish one." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-base font-bold leading-snug text-white">{event.name}</h3>
                          <Badge status={event.status}>{event.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-white/40">{event.organization?.name}</p>
                        <p className="mt-3 text-sm text-white/50">{formatDateRange(event.startsAt, event.endsAt)}</p>
                        <p className="mt-1 text-sm text-white/35">{event.venue}</p>
                        {event.capacity && (
                          <p className="mt-3 text-sm text-white/40">
                            {event._count.registrations}/{event.capacity} registered
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
    </div>
  );
}
