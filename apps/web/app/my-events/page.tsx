"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useMyRegistrations } from "@/lib/hooks";
import { formatDateRange } from "@/lib/format";

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: registrations, isLoading } = useMyRegistrations(!!user);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?next=/my-events");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <LoadingBlock label="Loading…" />;

  const now = Date.now();
  const upcoming = registrations?.filter((r) => new Date(r.event.endsAt).getTime() >= now) ?? [];
  const past = registrations?.filter((r) => new Date(r.event.endsAt).getTime() < now) ?? [];

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-5xl px-6 py-20">
        <KanjiMark glyph="出席" className="absolute -right-6 top-0 text-[9rem]" />

        <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">Your presence, tracked</span>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-white md:text-5xl">My events</h1>
        <p className="mt-4 max-w-xl text-lg text-white/55">
          Everything you&apos;ve registered for, and everywhere you&apos;ve checked in — in one place.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/events">
            <Button variant="secondary">Browse more events</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-16">
            <LoadingBlock />
          </div>
        ) : !registrations?.length ? (
          <div className="mt-16">
            <EmptyState
              glyph="無"
              title="Nothing here yet"
              description="Register for an event from Discover and it'll show up here, along with your check-in status."
            />
          </div>
        ) : (
          <div className="mt-16 space-y-16">
            {upcoming.length > 0 && (
              <RegistrationGroup label="Upcoming" registrations={upcoming} />
            )}
            {past.length > 0 && <RegistrationGroup label="Past" registrations={past} />}
          </div>
        )}
      </div>
    </div>
  );
}

function RegistrationGroup({
  label,
  registrations,
}: {
  label: string;
  registrations: NonNullable<ReturnType<typeof useMyRegistrations>["data"]>;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-white/70">{label}</h2>
      <div className="mt-4 divide-y divide-white/[0.06]">
        {registrations.map((r) => (
          <Link
            key={r.event.id}
            href={`/events/${r.event.id}`}
            className="group grid gap-2 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-shu-300 sm:text-xl">
                  {r.event.name}
                </h3>
                <Badge status={r.event.status}>{r.event.status}</Badge>
                {r.attended && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                    Checked in
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-white/50">
                {r.event.organization?.name} · {formatDateRange(r.event.startsAt, r.event.endsAt)}
              </p>
              <p className="mt-0.5 text-sm text-white/35">{r.event.venue}</p>
            </div>
            <span className="justify-self-start text-sm text-white/30 transition-colors group-hover:text-white/60 sm:justify-self-end">
              View →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
