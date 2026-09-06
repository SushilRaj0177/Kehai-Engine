"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { useMyOrganizations, useOrgEvents, useOrgOverview } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs, isLoading: orgsLoading } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);

  const { data: events, isLoading: eventsLoading } = useOrgEvents(org?.id);
  const { data: overview } = useOrgOverview(org?.id) as { data: any };

  if (orgsLoading) return <LoadingBlock />;
  if (!org) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState title="Organization not found" description="You may not be a member, or it doesn't exist." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="催" className="absolute -right-6 top-0 text-[10rem]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black text-white md:text-5xl">{org.name}</h1>
            <p className="mt-2 text-base text-white/40">/{org.slug}</p>
          </div>
          <Link href={`/orgs/${org.slug}/events/new`}>
            <Button size="lg">New event</Button>
          </Link>
        </div>

        {overview && (
          <div className="relative mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <MiniStat label="Events" value={overview.totalEvents} />
            <MiniStat label="Registrations" value={overview.totalRegistrations} />
            <MiniStat label="Attendance" value={overview.totalAttendance} />
            <MiniStat label="Avg. attendance rate" value={`${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`} />
          </div>
        )}

        <div className="relative mt-16">
          <h2 className="mb-6 font-display text-xl font-bold text-white/70">Events</h2>
          {eventsLoading ? (
            <LoadingBlock />
          ) : !events?.length ? (
            <EmptyState
              glyph="催"
              title="No events yet"
              description="Create your first event — set the venue, geofence, and publish when ready."
              action={
                <Link href={`/orgs/${org.slug}/events/new`}>
                  <Button>Create an event</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/orgs/${org.slug}/events/${event.id}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-base font-bold leading-snug text-white">{event.name}</h3>
                          <Badge status={event.status}>{event.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-white/40">{formatDateRange(event.startsAt, event.endsAt)}</p>
                        <p className="mt-1 text-sm text-white/35">{event.venue}</p>
                        <div className="mt-5 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-sm text-white/50">
                          <span>{event._count.registrations} registered</span>
                          <span>{event._count.attendances} attended</span>
                        </div>
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

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
