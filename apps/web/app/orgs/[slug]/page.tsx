"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
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
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-lg px-6 py-24">
          <EmptyState title="Organization not found" description="You may not be a member, or it doesn't exist." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <KanjiMark glyph="催" className="absolute -right-6 top-0 text-[9rem]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{org.name}</h1>
            <p className="mt-1 text-sm text-white/40">/{org.slug}</p>
          </div>
          <Link href={`/orgs/${org.slug}/events/new`}>
            <Button>New event</Button>
          </Link>
        </div>

        {overview && (
          <div className="relative mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Events" value={overview.totalEvents} />
            <MiniStat label="Registrations" value={overview.totalRegistrations} />
            <MiniStat label="Attendance" value={overview.totalAttendance} />
            <MiniStat label="Avg. attendance rate" value={`${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`} />
          </div>
        )}

        <div className="relative mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">Events</h2>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link key={event.id} href={`/orgs/${org.slug}/events/${event.id}`}>
                  <Card className="h-full transition-colors hover:border-shu-500/30">
                    <CardBody>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-semibold leading-snug text-white">{event.name}</h3>
                        <Badge status={event.status}>{event.status}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-white/40">{formatDateRange(event.startsAt, event.endsAt)}</p>
                      <p className="mt-1 text-xs text-white/35">{event.venue}</p>
                      <div className="mt-4 flex items-center gap-4 border-t border-white/8 pt-3 text-xs text-white/50">
                        <span>{event._count.registrations} registered</span>
                        <span>{event._count.attendances} attended</span>
                      </div>
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

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="font-display text-xl font-bold text-white">{value}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">{label}</div>
      </CardBody>
    </Card>
  );
}
