"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useMyRegistrations } from "@/lib/hooks";
import { formatDateRange, formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { SURFACE, SectionHead } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";

export default function MyEventsPage() {
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data: registrations, isLoading } = useMyRegistrations(!!user);
  const isStandalone = useIsStandalone();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?next=/my-events");
  }, [authLoading, user, router]);

  if (authLoading || !user) return <LoadingBlock label={t("common.loading")} />;

  const now = Date.now();
  // The soonest upcoming event — the one a user is most likely checking
  // this page to prepare for — was sorting to the bottom of "Upcoming"
  // because the fetch order (newest-created-event-first) doesn't match
  // either group's natural order. Upcoming reads soonest-first (what's
  // next), past reads most-recent-first (what you just did).
  const upcoming = (registrations?.filter((r) => new Date(r.event.endsAt).getTime() >= now) ?? []).sort(
    (a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime()
  );
  const past = (registrations?.filter((r) => new Date(r.event.endsAt).getTime() < now) ?? []).sort(
    (a, b) => new Date(b.event.startsAt).getTime() - new Date(a.event.startsAt).getTime()
  );

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-2xl space-y-7 px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <div className="flex items-start justify-between gap-3 px-1">
            <h1 className="font-display text-[26px] font-black leading-tight text-white">{t("myEvents.title")}</h1>
            <Link href="/events">
              <Button size="sm" variant="secondary">
                {t("myEvents.browseMore")}
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <LoadingBlock />
          ) : !registrations?.length ? (
            <EmptyState glyph="無" title={t("myEvents.emptyTitle")} description={t("myEvents.emptyDescription")} />
          ) : (
            <>
              {upcoming.length > 0 && <StandaloneRegistrationGroup label={t("myEvents.upcoming")} registrations={upcoming} />}
              {past.length > 0 && <StandaloneRegistrationGroup label={t("myEvents.past")} registrations={past} />}
            </>
          )}
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-5xl px-6 py-20">
        <KanjiMark glyph="出席" className="absolute -right-6 top-0 text-[5rem] sm:text-[9rem]" />

        <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">{t("myEvents.kicker")}</span>
        <h1 className="mt-3 font-display text-4xl font-black leading-tight text-white md:text-5xl">{t("myEvents.title")}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/55">
          {t("myEvents.subtitle")}
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/events">
            <Button variant="secondary">{t("myEvents.browseMore")}</Button>
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
              title={t("myEvents.emptyTitle")}
              description={t("myEvents.emptyDescription")}
            />
          </div>
        ) : (
          <div className="mt-16 space-y-16">
            {upcoming.length > 0 && (
              <RegistrationGroup label={t("myEvents.upcoming")} registrations={upcoming} />
            )}
            {past.length > 0 && <RegistrationGroup label={t("myEvents.past")} registrations={past} />}
          </div>
        )}
      </div>
    </ClickRippleLayer>
  );
}

function RegistrationGroup({
  label,
  registrations,
}: {
  label: string;
  registrations: NonNullable<ReturnType<typeof useMyRegistrations>["data"]>;
}) {
  const { t, locale } = useLocale();
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
                <Badge status={r.event.status}>{t(`badge.status.${r.event.status}`)}</Badge>
                {r.attended && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                    {t("badge.checkedIn")}
                  </span>
                )}
                {r.waitlisted && <Badge>{t("badge.waitlisted")}</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-white/50">
                {r.event.organization?.name} · {formatDateRange(r.event.startsAt, r.event.endsAt, locale)}
              </p>
              <p className="mt-0.5 text-sm text-white/35">{r.event.venue}</p>
            </div>
            <span className="justify-self-start text-sm text-white/30 transition-colors group-hover:text-white/60 sm:justify-self-end">
              {t("common.viewArrow")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StandaloneRegistrationGroup({
  label,
  registrations,
}: {
  label: string;
  registrations: NonNullable<ReturnType<typeof useMyRegistrations>["data"]>;
}) {
  const { t, locale } = useLocale();
  return (
    <section>
      <SectionHead title={label} />
      <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
        {registrations.map((r) => (
          <Link key={r.event.id} href={`/events/${r.event.id}`} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-white/85">{r.event.name}</p>
                {r.attended && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kehai-400" aria-hidden />}
                {r.waitlisted && <Badge>{t("badge.waitlisted")}</Badge>}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-white/35">
                {r.event.organization?.name ? `${r.event.organization.name} · ` : ""}
                {r.event.venue}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-[12px] text-white/45">{formatDate(r.event.startsAt, locale)}</p>
              {r.attended && (
                <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-kehai-300">
                  {t("badge.checkedIn")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
