"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { usePublicEvents } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";

export default function DiscoverEventsPage() {
  const { data: events, isLoading } = usePublicEvents();

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <KanjiMark glyph="催事" className="absolute -right-6 top-0 text-[8rem]" />
        <h1 className="relative font-display text-2xl font-bold text-white">Discover events</h1>
        <p className="relative mt-1 text-sm text-white/45">Published and currently active events across all organizations.</p>

        <div className="relative mt-8">
          {isLoading ? (
            <LoadingBlock />
          ) : !events?.length ? (
            <EmptyState glyph="無" title="No events published yet" description="Check back soon, or ask an organizer to publish one." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full transition-colors hover:border-shu-500/30">
                    <CardBody>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-semibold leading-snug text-white">{event.name}</h3>
                        <Badge status={event.status}>{event.status}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-white/40">{event.organization?.name}</p>
                      <p className="mt-3 text-xs text-white/50">{formatDateRange(event.startsAt, event.endsAt)}</p>
                      <p className="mt-1 text-xs text-white/35">{event.venue}</p>
                      {event.capacity && (
                        <p className="mt-3 text-[11px] text-white/40">
                          {event._count.registrations}/{event.capacity} registered
                        </p>
                      )}
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
