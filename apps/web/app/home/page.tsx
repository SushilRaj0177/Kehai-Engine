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
// Sharper corners and an inset top hairline (an instrument panel, not a
// soft rounded card) plus a plain-mono uppercase label convention below
// is the actual house style -- Button's HUD brackets, terminal prompts --
// not generic frosted glass.
const TILE =
  "relative rounded-lg border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[transform,border-color] active:scale-[0.97]";

const ACCENTS = {
  shu: { border: "border-shu-500/30", bg: "bg-shu-500/[0.06]", bar: "bg-shu-500", text: "text-shu-300", hex: "#ff2d55" },
  kehai: { border: "border-kehai-500/30", bg: "bg-kehai-500/[0.06]", bar: "bg-kehai-500", text: "text-kehai-300", hex: "#5ff4ff" },
} as const;
type AccentKey = keyof typeof ACCENTS;

function Tile({ span = 1, className = "", children }: { span?: 1 | 2; children: React.ReactNode; className?: string }) {
  return <div className={`${TILE} ${span === 2 ? "col-span-2" : ""} ${className}`}>{children}</div>;
}

// A hero tile: colored corner brackets (the same L-marks Button uses) plus
// a tinted wash and a left accent bar, reserved for the handful of widgets
// that actually deserve visual weight -- streak, live rate, the next
// event. Everything else on the page stays flat and quiet on purpose, so
// these read as "the important numbers" instead of every tile fighting
// for the same attention.
function AccentTile({
  accent,
  span = 1,
  className = "",
  children,
}: {
  accent: AccentKey;
  span?: 1 | 2;
  className?: string;
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`${TILE} ${a.border} ${a.bg} overflow-hidden ${span === 2 ? "col-span-2" : ""} ${className}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${a.bar}`} />
      <Corner accent={accent} pos="tl" />
      <Corner accent={accent} pos="br" />
      {children}
    </div>
  );
}

function Corner({ accent, pos }: { accent: AccentKey; pos: "tl" | "br" }) {
  const a = ACCENTS[accent];
  const edge = pos === "tl" ? "border-l-2 border-t-2 -left-px -top-px" : "border-r-2 border-b-2 -right-px -bottom-px";
  return <span aria-hidden className={`absolute z-10 h-2.5 w-2.5 ${edge}`} style={{ borderColor: a.hex }} />;
}

// Mono, uppercase, terminal-prompt style label -- the ">" glyph is the
// same prompt marker Button's "terminal" variant uses, so section headers
// read as part of the same visual system as the rest of the app instead
// of inventing their own generic small-caps convention.
function SectionLabel({ children, accent = "text-white/40" }: { children: React.ReactNode; accent?: string }) {
  return (
    <p className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${accent}`}>
      <span aria-hidden className="text-white/25">
        &gt;
      </span>
      {children}
    </p>
  );
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
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-white/35">{formatDate(new Date().toISOString(), locale)}</p>
          <h1 className="mt-1 font-display text-3xl font-black text-white">
            {greeting}, <span className="text-shu-300">{firstName}</span>
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {isAttendee && (
            <>
              <AccentTile accent="shu" className="p-4 pl-5">
                <div className="flex items-center gap-3">
                  <RateRing value={bestStreak ? Math.min(bestStreak.streak / 14, 1) : 0} accent={ACCENTS.shu.hex} glow>
                    <FlameIcon lit={!!bestStreak && bestStreak.streak > 0} />
                  </RateRing>
                  <div className="min-w-0 font-mono text-3xl font-black tabular-nums text-white">{bestStreak?.streak ?? 0}</div>
                </div>
                <SectionLabel accent="mt-2.5 text-shu-300/80">
                  {bestStreak ? t("home.streakDays", { count: bestStreak.streak }) : t("home.streakNone")}
                </SectionLabel>
                {bestStreak?.name && <p className="mt-0.5 truncate pl-4 text-[10px] text-white/30">{bestStreak.name}</p>}
              </AccentTile>
              <AccentTile accent="kehai" className="p-4 pl-5">
                <div className="flex items-center gap-3">
                  <RateRing value={overallRate} accent={ACCENTS.kehai.hex} glow />
                  <div className="min-w-0 font-mono text-3xl font-black tabular-nums text-white">{Math.round(overallRate * 100)}%</div>
                </div>
                <SectionLabel accent="mt-2.5 text-kehai-300/80">{t("home.overallRateLabel")}</SectionLabel>
              </AccentTile>
            </>
          )}

          {!isAttendee && isTeacher && (
            <>
              <StatBlock value={teacherTotals.students} label={t("home.studentsLabel")} accent="kehai" />
              <StatBlock value={teacherTotals.classes} label={t("home.classesLabel")} accent="shu" />
            </>
          )}

          {/* Real chart #1: a teacher's recent-session attendance, one bar
              per session, height = turnout for that day. */}
          {primaryTeaching && sessionBars.length >= 2 && (
            <Tile span={2} className="p-4">
              <div className="flex items-center justify-between">
                <SectionLabel>{primaryTeaching.name}</SectionLabel>
                <span className="font-mono text-[10px] uppercase tracking-wide text-kehai-300/70">{t("home.attendanceTrend")}</span>
              </div>
              <BarChart bars={sessionBars} accent={ACCENTS.kehai.hex} />
            </Tile>
          )}

          {/* Real chart #2: a student's own attendance history for their
              best-streak classroom -- one dot per session, filled if they
              were present. */}
          {historyBars.length >= 3 && (
            <Tile span={2} className="p-4">
              <div className="flex items-center justify-between">
                <SectionLabel>{bestStreak?.name}</SectionLabel>
                <span className="font-mono text-[10px] uppercase tracking-wide text-white/30">{t("home.attendanceHistory")}</span>
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

          {isAttendee &&
            (next ? (
              <AccentTile accent={canCheckInNow ? "kehai" : "shu"} span={2} className="group block">
                <Link href={canCheckInNow ? `/attend/${next.event.id}` : `/events/${next.event.id}`} className="block p-5 pl-6">
                  <div className="flex items-center justify-between gap-2">
                    <SectionLabel accent={canCheckInNow ? "text-kehai-300" : "text-shu-300/80"}>{t("home.nextEventHeading")}</SectionLabel>
                    {canCheckInNow && (
                      <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wide text-kehai-300">
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
                    <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm font-bold uppercase tracking-wide text-kehai-300 group-hover:text-kehai-200">
                      {t("home.checkInNow")} →
                    </span>
                  )}
                </Link>
              </AccentTile>
            ) : (
              <Tile span={2} className="border-dashed bg-transparent p-6 text-center">
                <p className="text-sm font-medium text-white/60">{t("home.nextEventNone")}</p>
                <p className="mt-1 text-xs text-white/35">{t("home.nextEventNoneHint")}</p>
              </Tile>
            ))}

          {later.map((r) => (
            <Tile key={r.event.id} span={2} className="block hover:border-white/[0.16]">
              <Link href={`/events/${r.event.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-medium text-white/75">{r.event.name}</span>
                <span className="shrink-0 font-mono text-xs text-white/40">{formatDate(r.event.startsAt, locale)}</span>
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
            <Tile key={e.classroom.id} span={2} className="block overflow-hidden border-amber-400/25 bg-amber-400/[0.05]">
              <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-amber-400" />
              <Link href={`/classrooms/${e.classroom.id}`} className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
                <span className="truncate text-sm font-medium text-amber-100/85">{e.classroom.name}</span>
                <span className="shrink-0 font-mono text-sm font-bold text-amber-300">{Math.round(e.attendanceRate * 100)}%</span>
              </Link>
            </Tile>
          ))}

          {teaching?.map((c) => (
            <TeachingTile key={c.id} classroom={c} t={t} />
          ))}

          {primaryOrg && orgOverview && (
            <>
              <StatBlock value={orgOverview.totalEvents} label={t("orgDetail.statEvents")} />
              <StatBlock value={orgOverview.totalAttendance} label={t("orgDetail.statAttendance")} />
              <Tile span={2} className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xl font-bold tabular-nums text-white">{Math.round((orgOverview.averageAttendanceRate ?? 0) * 100)}%</div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/40">{t("orgDetail.statAvgRateShort")}</div>
                  </div>
                  <Link href={`/orgs/${primaryOrg.slug}`} className="font-mono text-xs font-semibold uppercase tracking-wide text-shu-300">
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

  // Only the button below navigates -- the rest of this row is plain
  // display text, not a second, wider, invisible tap target doing the
  // same thing the button already does (that duplication was the
  // actual bug: it made the button pointless, since tapping anywhere
  // else on the row went to the same place anyway). A live session still
  // gets to look alive -- accent bar, tinted wash, pulsing dot -- an idle
  // one stays flat.
  const body = (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 p-4 pl-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isLive && <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-kehai-400" aria-hidden />}
          <p className="truncate text-sm font-bold text-white">{classroom.name}</p>
        </div>
        <p className={`mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${isLive ? "text-kehai-300" : "text-white/35"}`}>
          {isLive ? t("home.liveNow") : t("home.noSessionOpen")} · {t("home.studentsCount", { count: classroom.studentCount })}
        </p>
      </div>
      <Link href={`/classrooms/${classroom.id}`}>
        <Button size="sm" variant={isLive ? "cyan" : "secondary"}>
          {isLive ? t("home.manage") : t("home.startSession")}
        </Button>
      </Link>
    </div>
  );

  return isLive ? (
    <AccentTile accent="kehai" span={2} className="flex items-center">
      {body}
    </AccentTile>
  ) : (
    <Tile span={2} className="flex items-center">
      {body}
    </Tile>
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

// A rate ring -- the one shape on this page that actually means something
// (a fraction of 100%), so it's the one thing allowed a soft accent glow
// on its stroke, dial-and-digital-readout style, paired inline with a
// plain monospace number rather than centered inside it like a badge.
function RateRing({ value, accent, glow, children }: { value: number; accent: string; glow?: boolean; children?: React.ReactNode }) {
  return (
    <ProgressRing value={value} size={40} strokeWidth={4} accent={accent} glow={glow}>
      {children}
    </ProgressRing>
  );
}

// The stat treatment for a plain count -- no circle, no gradient, matching
// the org stats it's reused for exactly. It takes an accent purely as a
// color cue on the label and a bottom rule, not a tinted tile, so a row of
// these still reads as calm reference numbers next to the bolder hero
// tiles above them.
function StatBlock({ value, label, accent }: { value: React.ReactNode; label: string; accent?: AccentKey }) {
  const a = accent ? ACCENTS[accent] : null;
  return (
    <Tile className="overflow-hidden p-3.5">
      {a && <span aria-hidden className={`absolute inset-x-0 top-0 h-[2px] ${a.bar}`} />}
      <div className="font-mono text-xl font-bold tabular-nums text-white">{value}</div>
      <div className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${a ? a.text + "/80" : "text-white/40"}`}>{label}</div>
    </Tile>
  );
}

function ProgressRing({
  value,
  size,
  strokeWidth,
  accent,
  glow,
  children,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  accent: string;
  glow?: boolean;
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
          style={glow ? { filter: `drop-shadow(0 0 3px ${accent}aa)` } : undefined}
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
