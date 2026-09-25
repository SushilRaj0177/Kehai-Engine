"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useAuth } from "@/lib/auth-context";
import { useMyRegistrations, useEnrolledClassrooms, useMyOrganizations, useOrgOverview } from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

const ATTENTION_THRESHOLD = 0.75;

// The installed PWA's home screen (see app/page.tsx's standalone redirect).
// Every widget here answers a real question ("what's next," "how am I
// actually doing," "is anything slipping") rather than re-offering
// navigation the bottom tab bar already covers -- Discover/Classrooms/
// Console/Account are one tap away regardless, so a button here that just
// points at one of them adds nothing. Shapes stay deliberately varied:
// rings, a wide banner, a compact list, pill chips -- not a grid of
// same-sized cards.
export default function HomePage() {
  const { t, locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: registrations } = useMyRegistrations(!!user);
  const { data: enrolled } = useEnrolledClassrooms();
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

  // Aggregate, not per-classroom -- one honest "how am I actually doing
  // overall" number, computed from the same presentDays/totalDays every
  // classroom ring below is individually built from.
  const totals = (enrolled ?? []).reduce(
    (acc, e) => ({ present: acc.present + e.presentDays, total: acc.total + e.totalDays }),
    { present: 0, total: 0 }
  );
  const overallRate = totals.total > 0 ? totals.present / totals.total : 0;

  const needsAttention = (enrolled ?? []).filter((e) => e.totalDays >= 3 && e.attendanceRate < ATTENTION_THRESHOLD);

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-white/40">{formatDate(new Date().toISOString(), locale)}</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">
          {greeting}, {firstName}
        </h1>

        {/* Hero row: two real metrics as two different ring shapes, not a
            metric and a stretched filler box. */}
        <div className="mt-7 flex gap-3">
          <StreakWidget streak={bestStreak?.streak ?? 0} classroomName={bestStreak?.name} t={t} />
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            {totals.total > 0 ? (
              <>
                <ProgressRing value={overallRate} size={72} strokeWidth={6} accent="#5ff4ff">
                  <span className="font-display text-lg font-bold text-white">{Math.round(overallRate * 100)}%</span>
                </ProgressRing>
                <p className="text-center text-[11px] font-medium text-white/45">{t("home.overallRateLabel")}</p>
              </>
            ) : (
              <p className="text-center text-[11px] font-medium text-white/35">{t("home.classroomsNone")}</p>
            )}
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
            </div>
          )}
        </div>

        {/* What's after that -- real information (dates, names), not a
            second navigation surface. */}
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

        {/* Classrooms -- rings, each carrying two numbers (rate + streak),
            not a list of links. */}
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

        {/* Needs attention -- a proactive nudge no other page surfaces in
            one place: classrooms with enough history to mean something
            and a real, current dip. Only rendered when something actually
            qualifies. */}
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

        {/* Organization snapshot -- real numbers from the org you run, not
            a chip that just links to the console (Console is already a
            bottom-nav tab). Only the primary org, to keep this to one
            request. */}
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
      </div>
    </ClickRippleLayer>
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
