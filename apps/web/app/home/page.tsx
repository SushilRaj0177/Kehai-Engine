"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import { useMyRegistrations, useEnrolledClassrooms, useMyOrganizations } from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

// The installed PWA's home screen (see app/page.tsx's standalone redirect)
// -- everything relevant to this one signed-in person, glanceable without
// scrolling through unrelated sections, built from data every widget here
// already had a hook for (no new backend routes). Deliberately not a grid
// of same-sized cards: a circular streak ring, a wide banner for the one
// actionable "next thing", small rings for each classroom, and pill/chip
// rows read as distinct objects instead of one repeated shape.
export default function HomePage() {
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: registrations } = useMyRegistrations(!!user);
  const { data: enrolled } = useEnrolledClassrooms();
  const { data: orgs } = useMyOrganizations();

  if (authLoading) return <LoadingBlock label={t("states.checkingSession")} />;

  if (!user) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-white/60">{t("home.signInPrompt")}</p>
          <Link href="/login">
            <Button className="mt-4">{t("common.signIn")}</Button>
          </Link>
        </div>
      </ClickRippleLayer>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("home.greetingMorning") : hour < 18 ? t("home.greetingAfternoon") : t("home.greetingEvening");
  const firstName = user.name.split(" ")[0];

  const upcoming = (registrations ?? [])
    .filter((r) => new Date(r.event.endsAt) >= new Date() && r.event.status !== "CANCELLED")
    .sort((a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime());
  const next = upcoming[0];
  const nextWindow = next ? getCheckInWindow(next.event) : null;
  const canCheckInNow = !!next && !next.attended && nextWindow?.status === "open";

  const bestStreak = (enrolled ?? []).reduce<{ streak: number; name: string } | null>((best, e) => {
    if (!best || e.currentStreak > best.streak) return { streak: e.currentStreak, name: e.classroom.name };
    return best;
  }, null);

  const primaryOrg = orgs?.[0];

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-white/40">{formatDate(new Date().toISOString(), locale)}</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">
          {greeting}, {firstName}
        </h1>

        {/* Hero row: streak ring + compact count chips -- two different
            shapes sharing a row rather than one being stretched to match
            the other. */}
        <div className="mt-7 flex items-stretch gap-3">
          <StreakWidget streak={bestStreak?.streak ?? 0} classroomName={bestStreak?.name} t={t} />
          <div className="flex flex-1 flex-col justify-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
            <CountRow value={enrolled?.length ?? 0} label={t("home.classroomsHeading")} />
            <div className="h-px bg-white/[0.06]" />
            <CountRow value={upcoming.length} label={t("nav.myEvents")} />
          </div>
        </div>

        {/* Next-up banner -- the one actionable thing, given the most
            visual weight and the only widget that spans full width. */}
        <div className="mt-4">
          {next ? (
            <Link
              href={canCheckInNow ? `/attend/${next.event.id}` : `/events/${next.event.id}`}
              className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:border-shu-500/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.nextEventHeading")}</span>
                {canCheckInNow && (
                  <span className="flex items-center gap-1.5 rounded-full bg-kehai-500/15 px-2.5 py-1 text-[11px] font-semibold text-kehai-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-kehai-400" />
                    {t("home.checkInWindowOpen")}
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-xl font-bold text-white">{next.event.name}</p>
              <p className="mt-1 text-sm text-white/45">
                {formatDate(next.event.startsAt, locale)} · {next.event.venue}
              </p>
              {canCheckInNow && (
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-kehai-300 group-hover:text-kehai-200">
                  {t("home.checkInNow")} →
                </span>
              )}
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.1] p-5 text-center">
              <p className="text-sm font-medium text-white/60">{t("home.nextEventNone")}</p>
              <p className="mt-1 text-xs text-white/35">{t("home.nextEventNoneHint")}</p>
              <Link href="/events">
                <Button size="sm" variant="secondary" className="mt-4">
                  {t("nav.discover")}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Classrooms -- a horizontal strip of small rings, not a list --
            each one is its own attendance-rate ring rather than another
            rectangle. */}
        {enrolled && enrolled.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.classroomsHeading")}</h2>
            <div className="scroll-thin -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {enrolled.map((e) => (
                <Link key={e.classroom.id} href={`/classrooms/${e.classroom.id}`} className="flex shrink-0 flex-col items-center gap-2" style={{ width: "76px" }}>
                  <ProgressRing value={e.attendanceRate} size={60} strokeWidth={5} accent="#5ff4ff">
                    <span className="font-display text-xs font-bold text-white">{Math.round(e.attendanceRate * 100)}%</span>
                  </ProgressRing>
                  <span className="w-full truncate text-center text-[11px] font-medium text-white/60">{e.classroom.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions -- circular icon buttons with a label underneath,
            the iOS-shortcuts/home-screen-widget convention, instead of a
            row of button rectangles. */}
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.quickActionsHeading")}</h2>
          <div className="flex gap-5">
            <QuickAction href="/my-events" label={t("nav.myEvents")} icon={<TicketIcon />} />
            <QuickAction href="/events" label={t("nav.discover")} icon={<CompassIcon />} />
            <QuickAction href="/classrooms/join" label={t("classroomHub.joinClassroom")} icon={<PlusIcon />} />
            <QuickAction
              href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
              label={t("nav.consoleShort")}
              icon={<GridIcon />}
            />
          </div>
        </div>

        {/* Organizations -- a chip row, only when relevant. */}
        {orgs && orgs.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.orgsHeading")}</h2>
            <div className="scroll-thin -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {orgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/orgs/${org.slug}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-2 pr-4 transition-colors hover:border-shu-500/30"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-shu-500/15 font-display text-xs font-bold text-shu-300">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-white/80">{org.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClickRippleLayer>
  );
}

function CountRow({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-white/45">{label}</span>
    </div>
  );
}

function StreakWidget({
  streak,
  classroomName,
  t,
}: {
  streak: number;
  classroomName?: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex w-[132px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-shu-500/10 to-transparent p-4 text-center">
      {streak > 0 ? (
        <>
          <div className="flex items-center gap-1">
            <FlameIcon />
            <span className="font-display text-3xl font-black text-white">{streak}</span>
          </div>
          <p className="text-[11px] font-medium text-white/50">{t("home.streakDays", { count: streak })}</p>
          {classroomName && <p className="mt-0.5 truncate text-[10px] text-white/30">{classroomName}</p>}
        </>
      ) : (
        <>
          <FlameIcon dim />
          <p className="mt-1 text-[11px] font-medium text-white/45">{t("home.streakNone")}</p>
        </>
      )}
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex flex-1 flex-col items-center gap-2 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 transition-colors hover:border-shu-500/30 hover:text-white">
        {icon}
      </span>
      <span className="text-[11px] font-medium leading-tight text-white/55">{label}</span>
    </Link>
  );
}

function ProgressRing({
  value,
  size,
  strokeWidth,
  accent,
  children,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  accent: string;
  children: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function FlameIcon({ dim }: { dim?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={dim ? "none" : "#ff9142"} stroke={dim ? "rgba(255,255,255,0.3)" : "none"} strokeWidth="1.5">
      <path d="M12 2c1 3-3 4-3 7.5a3 3 0 006 0c1.5 1 2.5 2.8 2.5 4.9A5.5 5.5 0 0112 20a5.5 5.5 0 01-5.5-5.6c0-4.2 3.4-5.9 5.5-12.4z" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5A2.5 2.5 0 016.5 6h11A2.5 2.5 0 0120 8.5v1a2 2 0 000 4v1A2.5 2.5 0 0117.5 17h-11A2.5 2.5 0 014 14.5v-1a2 2 0 000-4z" />
      <path d="M14 6.5v11" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polygon points="15,9 13,13 9,15 11,11" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </svg>
  );
}
