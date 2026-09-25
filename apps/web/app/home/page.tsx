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
  useClassroomSessions,
  useMyAttendanceHistory,
} from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import type { ClassroomSummary } from "@/lib/types";

const ATTENTION_THRESHOLD = 0.75;

// Shared tile surface -- every widget on this page is built from this one
// primitive, arranged in a 2-column bento grid instead of stacked
// full-width sections. A grid of mixed 1- and 2-column tiles is what
// actually reads as "a dashboard" at a glance; a vertical list of
// sparsely-populated sections doesn't, no matter how each one is styled.
const TILE = "rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.015] transition-transform active:scale-[0.97]";

function Tile({ span = 1, className = "", children }: { span?: 1 | 2; children: React.ReactNode; className?: string }) {
  return <div className={`${TILE} ${span === 2 ? "col-span-2" : ""} ${className}`}>{children}</div>;
}

export default function HomePage() {
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: registrations } = useMyRegistrations(!!user);
  const { data: enrolled } = useEnrolledClassrooms();
  const { data: teaching } = useMyClassrooms();
  const { data: orgs } = useMyOrganizations();
  const primaryOrg = orgs?.[0];
  const { data: orgOverview } = useOrgOverview(primaryOrg?.id);

  const primaryTeaching = teaching?.[0];
  const { data: recentSessions } = useClassroomSessions(primaryTeaching?.id);

  const bestStreakClassroomId = (enrolled ?? []).reduce<{ id?: string; streak: number }>(
    (best, e) => (e.currentStreak > best.streak ? { id: e.classroom.id, streak: e.currentStreak } : best),
    { streak: -1 }
  ).id;
  const { data: myHistory } = useMyAttendanceHistory(bestStreakClassroomId);

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

  const isAttendee = (enrolled?.length ?? 0) > 0 || upcoming.length > 0;
  const isTeacher = (teaching?.length ?? 0) > 0;
  const teacherTotals = (teaching ?? []).reduce((acc, c) => ({ students: acc.students + c.studentCount, classes: acc.classes + 1 }), {
    students: 0,
    classes: 0,
  });
  const hasNothing = !isAttendee && !isTeacher && !primaryOrg;

  // Last up to 8 sessions, oldest to newest, as a bar chart -- a real
  // visualization built from real data (useClassroomSessions, already
  // polled every 8s by the classroom pages themselves), not another
  // number in a circle.
  const sessionBars = (recentSessions ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-8)
    .map((s) => ({
      label: formatDate(s.date, locale).split(" ").slice(0, 2).join(" "),
      value: primaryTeaching ? Math.min(s.presentCount / Math.max(primaryTeaching.studentCount, 1), 1) : 0,
      count: s.presentCount,
    }));

  const historyBars = (myHistory ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-14);

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="home-stagger relative mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <div>
          <p className="text-sm text-white/40">{formatDate(new Date().toISOString(), locale)}</p>
          <h1 className="mt-1 font-display text-3xl font-black text-white">
            {greeting}, {firstName}
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {isAttendee && (
            <>
              <Tile className="flex flex-col items-center gap-2.5 p-4">
                <RingGlowRing
                  value={bestStreak ? Math.min(bestStreak.streak / 14, 1) : 0}
                  accent="#ff2d55"
                  icon={<FlameIcon lit={!!bestStreak && bestStreak.streak > 0} />}
                  display={String(bestStreak?.streak ?? 0)}
                />
                <div className="text-center">
                  <p className="text-[11px] font-medium text-white/50">{bestStreak ? t("home.streakDays", { count: bestStreak.streak }) : t("home.streakNone")}</p>
                  {bestStreak?.name && <p className="mt-0.5 truncate text-[10px] text-white/30">{bestStreak.name}</p>}
                </div>
              </Tile>
              <Tile className="flex flex-col items-center gap-2.5 p-4">
                <RingGlowRing value={overallRate} accent="#5ff4ff" display={`${Math.round(overallRate * 100)}%`} />
                <p className="text-center text-[11px] font-medium text-white/50">{t("home.overallRateLabel")}</p>
              </Tile>
            </>
          )}

          {!isAttendee && isTeacher && (
            <>
              <Tile className="flex flex-col items-center gap-2.5 p-4">
                <CountBadge value={teacherTotals.students} accent="#5ff4ff" />
                <p className="text-[11px] font-medium text-white/50">{t("home.studentsLabel")}</p>
              </Tile>
              <Tile className="flex flex-col items-center gap-2.5 p-4">
                <CountBadge value={teacherTotals.classes} accent="#ff2d55" />
                <p className="text-[11px] font-medium text-white/50">{t("home.classesLabel")}</p>
              </Tile>
            </>
          )}

          {/* Real chart #1: a teacher's recent-session attendance, one bar
              per session, height = turnout for that day. */}
          {primaryTeaching && sessionBars.length >= 2 && (
            <Tile span={2} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{primaryTeaching.name}</p>
                <span className="text-[11px] text-white/30">{t("home.attendanceTrend")}</span>
              </div>
              <BarChart bars={sessionBars} accent="#5ff4ff" />
            </Tile>
          )}

          {/* Real chart #2: a student's own attendance history for their
              best-streak classroom -- one dot per session, filled if they
              were present. */}
          {historyBars.length >= 3 && (
            <Tile span={2} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{bestStreak?.name}</p>
                <span className="text-[11px] text-white/30">{t("home.attendanceHistory")}</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-1.5">
                {historyBars.map((h) => (
                  <div key={h.id} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${h.present ? "bg-kehai-400 shadow-[0_0_8px_rgba(95,244,255,0.6)]" : "bg-white/10"}`}
                      aria-hidden
                    />
                  </div>
                ))}
              </div>
            </Tile>
          )}

          {isAttendee && (
            <Tile
              span={2}
              className={`group block p-5 ${next ? "hover:border-shu-500/30" : "border-dashed"}`}
            >
              {next ? (
                <Link href={canCheckInNow ? `/attend/${next.event.id}` : `/events/${next.event.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("home.nextEventHeading")}</span>
                    {canCheckInNow && (
                      <span className="flex items-center gap-1.5 rounded-full bg-kehai-500/15 px-2.5 py-1 text-[11px] font-semibold text-kehai-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kehai-400" />
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
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">{t("home.nextEventNone")}</p>
                  <p className="mt-1 text-xs text-white/35">{t("home.nextEventNoneHint")}</p>
                </div>
              )}
            </Tile>
          )}

          {later.map((r) => (
            <Tile key={r.event.id} span={2} className="block">
              <Link href={`/events/${r.event.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-medium text-white/75">{r.event.name}</span>
                <span className="shrink-0 text-xs text-white/40">{formatDate(r.event.startsAt, locale)}</span>
              </Link>
            </Tile>
          ))}

          {enrolled?.map((e) => (
            <Tile key={e.classroom.id} className="block p-3.5 hover:border-kehai-500/30">
              <Link href={`/classrooms/${e.classroom.id}`} className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <ProgressRing value={e.attendanceRate} size={46} strokeWidth={4} accent="#5ff4ff">
                    <span className="text-[10px] font-bold text-white">{Math.round(e.attendanceRate * 100)}%</span>
                  </ProgressRing>
                  {e.currentStreak > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-void-950 bg-shu-500 px-0.5 text-[9px] font-bold text-white">
                      {e.currentStreak}
                    </span>
                  )}
                </div>
                <span className="truncate text-[13px] font-medium text-white/70">{e.classroom.name}</span>
              </Link>
            </Tile>
          ))}

          {needsAttention.map((e) => (
            <Tile key={e.classroom.id} span={2} className="block border-amber-400/15 bg-amber-400/[0.04]">
              <Link href={`/classrooms/${e.classroom.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-2 truncate text-sm font-medium text-amber-100/85">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {e.classroom.name}
                </span>
                <span className="shrink-0 text-sm font-semibold text-amber-300">{Math.round(e.attendanceRate * 100)}%</span>
              </Link>
            </Tile>
          ))}

          {teaching?.map((c) => (
            <TeachingTile key={c.id} classroom={c} t={t} />
          ))}

          {primaryOrg && orgOverview && (
            <>
              <Tile className="p-3.5">
                <div className="font-display text-xl font-bold text-white">{orgOverview.totalEvents}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{t("orgDetail.statEvents")}</div>
              </Tile>
              <Tile className="p-3.5">
                <div className="font-display text-xl font-bold text-white">{orgOverview.totalAttendance}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{t("orgDetail.statAttendance")}</div>
              </Tile>
              <Tile span={2} className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-xl font-bold text-white">{Math.round((orgOverview.averageAttendanceRate ?? 0) * 100)}%</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{t("orgDetail.statAvgRateShort")}</div>
                  </div>
                  <Link href={`/orgs/${primaryOrg.slug}`} className="text-xs font-semibold text-shu-300">
                    {primaryOrg.name} →
                  </Link>
                </div>
              </Tile>
            </>
          )}

          {hasNothing && (
            <Tile span={2} className="border-dashed p-6 text-center">
              <p className="text-sm font-medium text-white/60">{t("home.getStartedTitle")}</p>
              <p className="mt-1 text-xs text-white/35">{t("home.getStartedHint")}</p>
            </Tile>
          )}
        </div>
      </div>
    </ClickRippleLayer>
  );
}

function TeachingTile({
  classroom,
  t,
}: {
  classroom: ClassroomSummary;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { data: detail } = useClassroom(classroom.id);
  const isLive = !!detail?.openSession;

  return (
    <div className={`${TILE} col-span-2 flex items-center justify-between gap-3 p-4 ${isLive ? "border-kehai-500/30 bg-gradient-to-r from-kehai-500/[0.08] to-transparent" : ""}`}>
      <Link href={`/classrooms/${classroom.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLive && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-kehai-400" aria-hidden />}
          <p className="truncate text-sm font-bold text-white">{classroom.name}</p>
        </div>
        <p className={`mt-1 text-xs font-semibold ${isLive ? "text-kehai-300" : "text-white/35"}`}>
          {isLive ? t("home.liveNow") : t("home.noSessionOpen")} · {t("home.studentsCount", { count: classroom.studentCount })}
        </p>
      </Link>
      <Link href={`/classrooms/${classroom.id}`}>
        <Button size="sm" variant={isLive ? "cyan" : "secondary"}>
          {isLive ? t("home.manage") : t("home.startSession")}
        </Button>
      </Link>
    </div>
  );
}

function BarChart({ bars, accent }: { bars: { label: string; value: number; count: number }[]; accent: string }) {
  return (
    <div className="mt-4 flex items-end justify-between gap-2">
      {bars.map((b, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold text-white/50">{b.count}</span>
          {/* Fixed-height track, bar grows up from the bottom -- items-end
              on the track does the alignment, the bar's own height is
              just its real percentage, no manual offset math. */}
          <div className="flex h-14 w-full items-end overflow-hidden rounded-md bg-white/[0.06]">
            <div
              className="w-full rounded-md transition-[height] duration-500"
              style={{ height: `${Math.max(b.value * 100, 6)}%`, background: `linear-gradient(180deg, ${accent}, ${accent}66)` }}
            />
          </div>
          <span className="text-[9px] text-white/30">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function RingGlowRing({ value, accent, icon, display }: { value: number; accent: string; icon?: React.ReactNode; display: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div aria-hidden className="absolute h-20 w-20 rounded-full blur-xl" style={{ background: accent, opacity: 0.22 }} />
      <ProgressRing value={value} size={72} strokeWidth={6} accent={accent}>
        <div className="flex flex-col items-center gap-0.5">
          {icon}
          <span className="font-display text-base font-bold leading-none text-white">{display}</span>
        </div>
      </ProgressRing>
    </div>
  );
}

function CountBadge({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <div aria-hidden className="absolute h-20 w-20 rounded-full blur-xl" style={{ background: accent, opacity: 0.22 }} />
      <div
        className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{ background: `radial-gradient(circle at 35% 30%, ${accent}40, ${accent}0d)`, border: `1px solid ${accent}45` }}
      >
        <span className="font-display text-2xl font-black text-white">{value}</span>
      </div>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill={lit ? "#ff9142" : "none"} stroke={lit ? "none" : "rgba(255,255,255,0.35)"} strokeWidth="1.75">
      <path d="M12 2c1 3-3 4-3 7.5a3 3 0 006 0c1.5 1 2.5 2.8 2.5 4.9A5.5 5.5 0 0112 20a5.5 5.5 0 01-5.5-5.6c0-4.2 3.4-5.9 5.5-12.4z" />
    </svg>
  );
}
