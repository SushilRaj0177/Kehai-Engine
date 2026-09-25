"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import {
  useMyRegistrations,
  useEnrolledClassrooms,
  useMyOrganizations,
  useOrgOverview,
  useMyClassrooms,
  useClassroom,
} from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import type { ClassroomSummary } from "@/lib/types";

const ATTENTION_THRESHOLD = 0.75;

// The installed PWA's home screen (see app/page.tsx's standalone redirect).
// Adaptive, not one fixed layout: a pure organizer/teacher with no
// attendee footprint of their own has nothing to show in a streak ring or
// a "next event" banner, and rendering those anyway as empty placeholders
// is exactly what left this page mostly dead space for that persona.
// Every section below only renders when it has something real to say, and
// a teacher's own classes -- entirely missing before, despite being the
// single most relevant thing to a "Prof" account -- now get real, live
// content: whether a session is open right now, not just a link.
export default function HomePage() {
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: registrations } = useMyRegistrations(!!user);
  const { data: enrolled } = useEnrolledClassrooms();
  const { data: teaching } = useMyClassrooms();
  const { data: orgs } = useMyOrganizations();
  const primaryOrg = orgs?.[0];
  const { data: orgOverview } = useOrgOverview(primaryOrg?.id);

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
  const later = upcoming.slice(1, 4);
  const nextWindow = next ? getCheckInWindow(next.event) : null;
  const canCheckInNow = !!next && !next.attended && nextWindow?.status === "open";

  const bestStreak = (enrolled ?? []).reduce<{ streak: number; name: string } | null>((best, e) => {
    if (!best || e.currentStreak > best.streak) return { streak: e.currentStreak, name: e.classroom.name };
    return best;
  }, null);

  const totals = (enrolled ?? []).reduce(
    (acc, e) => ({ present: acc.present + e.presentDays, total: acc.total + e.totalDays }),
    { present: 0, total: 0 }
  );
  const overallRate = totals.total > 0 ? totals.present / totals.total : 0;
  const needsAttention = (enrolled ?? []).filter((e) => e.totalDays >= 3 && e.attendanceRate < ATTENTION_THRESHOLD);

  // Whether this account has any attendee footprint at all -- decides
  // whether the streak/rate/next-event sections are relevant, versus
  // just empty noise for a pure organizer/teacher account.
  const isAttendee = (enrolled?.length ?? 0) > 0 || upcoming.length > 0;
  const isTeacher = (teaching?.length ?? 0) > 0;
  const teacherTotals = (teaching ?? []).reduce((acc, c) => ({ students: acc.students + c.studentCount, classes: acc.classes + 1 }), {
    students: 0,
    classes: 0,
  });

  const hasNothing = !isAttendee && !isTeacher && !primaryOrg;

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-white/40">{formatDate(new Date().toISOString(), locale)}</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">
          {greeting}, {firstName}
        </h1>

        {/* Hero row: attendee metrics if this account has any, otherwise
            teaching totals -- never both, and never an empty placeholder
            standing in for a metric that doesn't apply to this account. */}
        {isAttendee ? (
          <div className="mt-7 flex gap-3">
            <RingStat
              value={bestStreak ? Math.min(bestStreak.streak / 14, 1) : 0}
              display={String(bestStreak?.streak ?? 0)}
              label={bestStreak ? t("home.streakDays", { count: bestStreak.streak }) : t("home.streakNone")}
              sublabel={bestStreak?.name}
              accent="#ff2d55"
              icon={<FlameIcon lit={!!bestStreak && bestStreak.streak > 0} />}
            />
            <RingStat
              value={overallRate}
              display={`${Math.round(overallRate * 100)}%`}
              label={t("home.overallRateLabel")}
              accent="#5ff4ff"
            />
          </div>
        ) : isTeacher ? (
          <div className="mt-7 flex gap-3">
            <CountCircle value={teacherTotals.students} label={t("home.studentsLabel")} accent="#5ff4ff" />
            <CountCircle value={teacherTotals.classes} label={t("home.classesLabel")} accent="#ff2d55" />
          </div>
        ) : null}

        {/* Next-up banner -- only relevant to an account that actually
            registers for events; a pure teacher/organizer account has
            nothing to check in to, so this section doesn't render at all
            rather than showing an empty "nothing on your calendar" box. */}
        {isAttendee && (
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
              </div>
            )}
          </div>
        )}

        {later.length > 0 && (
          <div className="mt-3 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            {later.map((r) => (
              <Link key={r.event.id} href={`/events/${r.event.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-medium text-white/75">{r.event.name}</span>
                <span className="shrink-0 text-xs text-white/40">{formatDate(r.event.startsAt, locale)}</span>
              </Link>
            ))}
          </div>
        )}

        {enrolled && enrolled.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.classroomsHeading")}</h2>
            <div className="scroll-thin -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {enrolled.map((e) => (
                <Link
                  key={e.classroom.id}
                  href={`/classrooms/${e.classroom.id}`}
                  className="flex shrink-0 flex-col items-center gap-2"
                  style={{ width: "76px" }}
                >
                  <div className="relative">
                    <ProgressRing value={e.attendanceRate} size={60} strokeWidth={5} accent="#5ff4ff">
                      <span className="font-display text-xs font-bold text-white">{Math.round(e.attendanceRate * 100)}%</span>
                    </ProgressRing>
                    {e.currentStreak > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-void-950 bg-shu-500 px-1 text-[10px] font-bold text-white">
                        {e.currentStreak}
                      </span>
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[11px] font-medium text-white/60">{e.classroom.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {needsAttention.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-300/70">{t("home.attentionHeading")}</h2>
            <div className="space-y-2">
              {needsAttention.map((e) => (
                <Link
                  key={e.classroom.id}
                  href={`/classrooms/${e.classroom.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] px-4 py-3"
                >
                  <span className="truncate text-sm font-medium text-amber-100/85">{e.classroom.name}</span>
                  <span className="shrink-0 text-sm font-semibold text-amber-300">{Math.round(e.attendanceRate * 100)}%</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Classes you teach -- new. Each card fetches its own live
            open-session state (TeachingClassCard below), which the plain
            list-of-classrooms endpoint this page otherwise uses doesn't
            include -- that live "is a session open right now" signal is
            the one thing that actually makes this useful to check from a
            home screen instead of just being another link to /classrooms. */}
        {teaching && teaching.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{t("classroomHub.teachingHeading")}</h2>
            <div className="scroll-thin -mx-5 flex gap-3 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              {teaching.map((c) => (
                <TeachingClassCard key={c.id} classroom={c} t={t} />
              ))}
            </div>
          </div>
        )}

        {primaryOrg && orgOverview && (
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{primaryOrg.name}</h2>
            <div className="scroll-thin -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              <SnapshotStat value={orgOverview.totalEvents} label={t("orgDetail.statEvents")} />
              <SnapshotStat value={orgOverview.totalAttendance} label={t("orgDetail.statAttendance")} />
              <SnapshotStat value={`${Math.round((orgOverview.averageAttendanceRate ?? 0) * 100)}%`} label={t("orgDetail.statAvgRateShort")} />
            </div>
          </div>
        )}

        {hasNothing && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/[0.1] p-6 text-center">
            <p className="text-sm font-medium text-white/60">{t("home.getStartedTitle")}</p>
            <p className="mt-1 text-xs text-white/35">{t("home.getStartedHint")}</p>
          </div>
        )}
      </div>
    </ClickRippleLayer>
  );
}

function TeachingClassCard({
  classroom,
  t,
}: {
  classroom: ClassroomSummary;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { data: detail } = useClassroom(classroom.id);
  const isLive = !!detail?.openSession;

  return (
    <Link
      href={`/classrooms/${classroom.id}`}
      className={`flex shrink-0 flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors ${
        isLive ? "border-kehai-500/30 bg-kehai-500/[0.06]" : "border-white/[0.08] bg-white/[0.03] hover:border-shu-500/30"
      }`}
      style={{ width: "168px", minHeight: "108px" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-bold text-white">{classroom.name}</p>
        {isLive && <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-kehai-400" aria-hidden />}
      </div>
      <div>
        <p className={`text-xs font-semibold ${isLive ? "text-kehai-300" : "text-white/35"}`}>
          {isLive ? t("home.liveNow") : t("home.noSessionOpen")}
        </p>
        <p className="mt-1 text-[11px] text-white/40">{t("home.studentsCount", { count: classroom.studentCount })}</p>
      </div>
    </Link>
  );
}

function SnapshotStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3" style={{ minWidth: "100px" }}>
      <div className="font-display text-xl font-bold text-white">{value}</div>
      <div className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

// A progress ring wrapping a stat, always a ring -- even at zero value, so
// "no streak yet" reads as an empty ring (consistent with its full-value
// sibling right next to it) rather than degrading into a plain bordered
// box, which is what made the previous zero-state look like a different,
// lesser kind of widget instead of the same one with nothing in it yet.
function RingStat({
  value,
  display,
  label,
  sublabel,
  accent,
  icon,
}: {
  value: number;
  display: string;
  label: string;
  sublabel?: string;
  accent: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <ProgressRing value={value} size={72} strokeWidth={6} accent={accent}>
        <div className="flex flex-col items-center gap-0.5">
          {icon}
          <span className="font-display text-base font-bold leading-none text-white">{display}</span>
        </div>
      </ProgressRing>
      <div className="text-center">
        <p className="text-[11px] font-medium text-white/50">{label}</p>
        {sublabel && <p className="mt-0.5 truncate text-[10px] text-white/30">{sublabel}</p>}
      </div>
    </div>
  );
}

// A static circular badge for an absolute count (students, classes) --
// deliberately not a ProgressRing, which implies a fraction of something.
// A plain number doesn't have a "percent of what," so it gets a filled
// circle instead of a stroked one.
function CountCircle({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div
        className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{ background: `radial-gradient(circle at 35% 30%, ${accent}33, ${accent}0d)`, border: `1px solid ${accent}40` }}
      >
        <span className="font-display text-2xl font-black text-white">{value}</span>
      </div>
      <p className="text-[11px] font-medium text-white/50">{label}</p>
    </div>
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

function FlameIcon({ lit }: { lit: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={lit ? "#ff9142" : "none"} stroke={lit ? "none" : "rgba(255,255,255,0.35)"} strokeWidth="1.5">
      <path d="M12 2c1 3-3 4-3 7.5a3 3 0 006 0c1.5 1 2.5 2.8 2.5 4.9A5.5 5.5 0 0112 20a5.5 5.5 0 01-5.5-5.6c0-4.2 3.4-5.9 5.5-12.4z" />
    </svg>
  );
}
