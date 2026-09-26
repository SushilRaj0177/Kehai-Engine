"use client";

import { useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { SHU, KEHAI, SURFACE, SectionHead, MetricStrip, Meter, Avatar, Dial, PulseDot, FlameIcon, useElapsed } from "@/components/ui/Hud";
import { useAuth } from "@/lib/auth-context";
import {
  useMyRegistrations,
  useEnrolledClassrooms,
  useMyOrganizations,
  useOrgOverview,
  useMyClassrooms,
  useClassroom,
  useClassroomSessions,
  useClassroomHeatmap,
  useClassroomRoster,
  useClassroomLeaderboard,
} from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import type { ClassroomSummary, EnrolledClassroom, MyRegistration, OrgOverview } from "@/lib/types";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Locale = "en" | "ja";

const ATTENTION_THRESHOLD = 0.75;

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

  const isAttendee = (enrolled?.length ?? 0) > 0 || upcoming.length > 0;
  const isTeacher = (teaching?.length ?? 0) > 0;
  const hasNothing = !isAttendee && !isTeacher && !primaryOrg;

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="home-stagger relative mx-auto max-w-2xl space-y-8 px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
        <header className="px-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
            {formatDate(new Date().toISOString(), locale)}
          </p>
          <h1 className="mt-1.5 font-display text-[28px] font-black leading-tight text-white">
            {greeting},{" "}
            <span
              className="bg-gradient-to-r from-white via-shu-400 to-shu-600 bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 14px rgba(255,45,85,0.45))" }}
            >
              {firstName}
            </span>
          </h1>
        </header>

        {isTeacher && teaching && <TeacherSection classrooms={teaching} t={t} locale={locale} />}
        {isAttendee && <AttendeeSection enrolled={enrolled ?? []} upcoming={upcoming} t={t} locale={locale} />}
        {primaryOrg && orgOverview && (
          <OrgSection overview={orgOverview} slug={primaryOrg.slug} name={primaryOrg.name} t={t} locale={locale} />
        )}
        {hasNothing && <GetStarted t={t} />}
      </div>
    </ClickRippleLayer>
  );
}

/* ------------------------------------------------------------------ */
/* Teacher                                                             */
/* ------------------------------------------------------------------ */

function TeacherSection({ classrooms, t, locale }: { classrooms: ClassroomSummary[]; t: T; locale: Locale }) {
  const primary = classrooms[0];
  const { data: detail } = useClassroom(primary.id);
  const { data: sessions } = useClassroomSessions(primary.id);
  const openSession = sessions?.find((s) => s.status === "OPEN");
  const isLive = !!detail?.openSession;

  // The roster only matters while a session is actually open — passing
  // undefined otherwise keeps SWR from opening an 8s poll for a list
  // nobody is looking at.
  const { data: roster } = useClassroomRoster(isLive ? primary.id : undefined);
  const presentNow = (roster ?? []).filter((r) => r.checkedInOpenSession);

  const studentCount = detail?.studentCount ?? primary.studentCount;
  const elapsed = useElapsed(openSession?.openedAt);

  const closed = (sessions ?? [])
    .filter((s) => s.status === "CLOSED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const avgRate =
    closed.length > 0 && studentCount > 0
      ? closed.reduce((sum, s) => sum + Math.min(s.presentCount / studentCount, 1), 0) / closed.length
      : 0;

  const trend = (sessions ?? [])
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((s) => ({
      value: studentCount > 0 ? Math.min(s.presentCount / studentCount, 1) : 0,
      count: s.presentCount,
      label: new Date(s.date).getDate().toString(),
    }));

  return (
    <div className="space-y-8">
      <section>
        <LiveCard
          name={primary.name}
          courseCode={primary.courseCode}
          isLive={isLive}
          present={presentNow.length}
          total={studentCount}
          elapsed={elapsed}
          lastSessionDate={closed[0] ? formatDate(closed[0].date, locale) : null}
          href={`/classrooms/${primary.id}`}
          t={t}
        />
        <div className="mt-3">
          <MetricStrip
            items={[
              { value: studentCount, label: t("home.studentsLabel") },
              { value: primary.sessionCount, label: t("home.sessionsLabel") },
              { value: `${Math.round(avgRate * 100)}%`, label: t("home.avgRateLabel") },
            ]}
          />
        </div>
      </section>

      {isLive && (
        <section>
          <SectionHead title={t("home.checkedIn")} trailing={`${presentNow.length}/${studentCount}`} />
          <div className={`${SURFACE} p-4`}>
            {presentNow.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-white/35">{t("home.noOneYet")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {presentNow.slice(0, 18).map((r) => (
                  <Avatar key={r.student.id} name={r.student.name} url={r.student.avatarUrl} />
                ))}
                {presentNow.length > 18 && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] font-mono text-[11px] font-bold text-white/50">
                    +{presentNow.length - 18}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <HeatmapSection classroomId={primary.id} t={t} />

      <section>
        <SectionHead title={t("home.attendanceTrend")} />
        <TrendCard bars={trend} accent={KEHAI} emptyLabel={t("home.noSessionsYet")} />
      </section>

      <LeaderboardSection classroomId={primary.id} joinCode={primary.joinCode} studentCount={studentCount} t={t} />

      {classrooms.length > 1 && (
        <section>
          <SectionHead title={t("home.otherClassesHeading")} />
          <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
            {classrooms.slice(1).map((c) => (
              <OtherClassRow key={c.id} classroom={c} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// The page's anchor. Deliberately the same generous height whether or not
// a session is running: an idle state that collapses to a thin strip is
// what made the old dashboard look half-finished on a quiet day.
function LiveCard({
  name,
  courseCode,
  isLive,
  present,
  total,
  elapsed,
  lastSessionDate,
  href,
  t,
}: {
  name: string;
  courseCode: string | null;
  isLive: boolean;
  present: number;
  total: number;
  elapsed: string | null;
  lastSessionDate: string | null;
  href: string;
  t: T;
}) {
  const ratio = total > 0 ? present / total : 0;
  const accent = isLive ? KEHAI : SHU;

  return (
    <div className={`relative overflow-hidden rounded-[26px] border p-5 ${isLive ? "border-kehai-500/25" : "border-white/[0.07]"}`}>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: isLive
            ? `radial-gradient(130% 110% at 100% 0%, ${KEHAI}22, transparent 58%), linear-gradient(180deg, #0c1219, #080b11)`
            : `radial-gradient(130% 110% at 100% 0%, ${SHU}18, transparent 58%), linear-gradient(180deg, #0c0e14, #08090d)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            {isLive && <PulseDot />}
            <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${isLive ? "text-kehai-300" : "text-white/35"}`}>
              {isLive ? t("home.sessionLive") : t("home.sessionIdle")}
            </span>
          </span>
          <h2 className="mt-2 truncate font-display text-[22px] font-black leading-tight text-white">{name}</h2>
          <p className="mt-1 truncate text-[13px] text-white/40">
            {courseCode ? `${courseCode} · ` : ""}
            {isLive && elapsed
              ? t("home.runningFor", { duration: elapsed })
              : lastSessionDate
                ? t("home.lastSessionOn", { date: lastSessionDate })
                : t("home.noSessionsYet")}
          </p>
        </div>

        <Dial value={ratio} accent={accent} active={isLive}>
          <span className="font-mono text-[17px] font-black leading-none text-white">{isLive ? present : total}</span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-white/35">
            {isLive ? `/${total}` : t("home.studentsLabel")}
          </span>
        </Dial>
      </div>

      {!isLive && <p className="mt-4 text-[13px] leading-relaxed text-white/35">{t("home.sessionIdleHint")}</p>}

      <Link href={href} className="mt-5 block">
        <Button size="md" variant={isLive ? "cyan" : "primary"} className="w-full">
          {isLive ? t("home.manage") : t("home.startSession")}
        </Button>
      </Link>
    </div>
  );
}

function LeaderboardSection({
  classroomId,
  joinCode,
  studentCount,
  t,
}: {
  classroomId: string;
  joinCode: string;
  studentCount: number;
  t: T;
}) {
  const { data: board } = useClassroomLeaderboard(studentCount > 0 ? classroomId : undefined);

  // With nobody enrolled there is no leaderboard to draw, so the slot goes
  // to the one thing a teacher in that state actually needs: the code
  // students join with.
  if (studentCount === 0) {
    return (
      <section>
        <SectionHead title={t("home.topStreaks")} />
        <JoinCodeCard code={joinCode} t={t} />
      </section>
    );
  }

  const rows = (board ?? []).slice(0, 5);
  return (
    <section>
      <SectionHead title={t("home.topStreaks")} />
      <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-white/35">{t("home.noStudentsYet")}</p>
        ) : (
          rows.map((row, i) => (
            <div key={row.student.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-4 shrink-0 font-mono text-[12px] font-bold text-white/25">{i + 1}</span>
              <Avatar name={row.student.name} url={row.student.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white/85">{row.student.name}</p>
                <div className="mt-1.5">
                  <Meter value={row.attendanceRate} accent={KEHAI} />
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 font-mono text-[13px] font-bold text-shu-300">
                {row.currentStreak}
                <FlameIcon lit={row.currentStreak > 0} size={13} />
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function JoinCodeCard({ code, t }: { code: string; t: T }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={`${SURFACE} px-5 py-6 text-center`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">{t("home.joinCodeLabel")}</p>
      <p className="mt-3 font-mono text-[34px] font-black tracking-[0.2em] text-white">{code}</p>
      <p className="mt-2 text-[13px] text-white/35">{t("home.noStudentsYet")}</p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(code).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            },
            () => undefined
          );
        }}
        className="mt-4 rounded-full border border-white/[0.12] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white/70 transition-colors active:bg-white/[0.08]"
      >
        {copied ? t("home.copied") : t("home.copy")}
      </button>
    </div>
  );
}

function OtherClassRow({ classroom, t }: { classroom: ClassroomSummary; t: T }) {
  const { data: detail } = useClassroom(classroom.id);
  const isLive = !!detail?.openSession;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-white/85">
          {isLive && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-kehai-400" aria-hidden />}
          {classroom.name}
        </p>
        <p className="mt-0.5 text-[12px] text-white/35">{t("home.studentsCount", { count: classroom.studentCount })}</p>
      </div>
      <Link href={`/classrooms/${classroom.id}`}>
        <Button size="sm" variant={isLive ? "cyan" : "secondary"}>
          {isLive ? t("home.manage") : t("home.startSession")}
        </Button>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attendee                                                            */
/* ------------------------------------------------------------------ */

function AttendeeSection({
  enrolled,
  upcoming,
  t,
  locale,
}: {
  enrolled: EnrolledClassroom[];
  upcoming: MyRegistration[];
  t: T;
  locale: Locale;
}) {
  const next = upcoming[0];
  const later = upcoming.slice(1, 4);
  const nextWindow = next ? getCheckInWindow(next.event) : null;
  const canCheckInNow = !!next && !next.attended && nextWindow?.status === "open";

  const best = enrolled.reduce<EnrolledClassroom | null>((b, e) => (!b || e.currentStreak > b.currentStreak ? e : b), null);
  const totals = enrolled.reduce((acc, e) => ({ present: acc.present + e.presentDays, total: acc.total + e.totalDays }), {
    present: 0,
    total: 0,
  });
  const overallRate = totals.total > 0 ? totals.present / totals.total : 0;
  const needsAttention = enrolled.filter((e) => e.totalDays >= 3 && e.attendanceRate < ATTENTION_THRESHOLD);

  return (
    <div className="space-y-8">
      <section>
        <NextEventCard next={next} canCheckInNow={canCheckInNow} t={t} locale={locale} />
        <div className="mt-3">
          <MetricStrip
            items={[
              { value: best?.currentStreak ?? 0, label: t("home.dayStreakLabel") },
              { value: `${Math.round(overallRate * 100)}%`, label: t("home.overallRateLabel") },
              { value: enrolled.length, label: t("home.classesLabel") },
            ]}
          />
        </div>
      </section>

      {best && <HeatmapSection classroomId={best.classroom.id} t={t} />}

      {enrolled.length > 0 && (
        <section>
          <SectionHead title={t("home.classroomsHeading")} />
          <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
            {enrolled.map((e) => (
              <Link key={e.classroom.id} href={`/classrooms/${e.classroom.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white/85">{e.classroom.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-white/35">{e.classroom.teacherName}</p>
                  <div className="mt-2">
                    <Meter value={e.attendanceRate} accent={e.attendanceRate < ATTENTION_THRESHOLD ? "#fbbf24" : KEHAI} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[15px] font-black text-white">{Math.round(e.attendanceRate * 100)}%</p>
                  {e.currentStreak > 0 && (
                    <p className="mt-0.5 flex items-center justify-end gap-1 font-mono text-[11px] font-bold text-shu-300">
                      {e.currentStreak}
                      <FlameIcon lit size={11} />
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {needsAttention.length > 0 && (
        <section>
          <SectionHead title={t("home.attentionHeading")} />
          <div className="space-y-2">
            {needsAttention.map((e) => (
              <Link
                key={e.classroom.id}
                href={`/classrooms/${e.classroom.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3"
              >
                <span className="truncate text-[14px] font-medium text-amber-100/85">{e.classroom.name}</span>
                <span className="shrink-0 font-mono text-[14px] font-bold text-amber-300">{Math.round(e.attendanceRate * 100)}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {later.length > 0 && (
        <section>
          <SectionHead title={t("home.upcomingHeading")} />
          <div className={`${SURFACE} divide-y divide-white/[0.05] overflow-hidden`}>
            {later.map((r) => (
              <Link key={r.event.id} href={`/events/${r.event.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-white/80">{r.event.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-white/35">{r.event.venue}</p>
                </div>
                <span className="shrink-0 font-mono text-[12px] text-white/40">{formatDate(r.event.startsAt, locale)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NextEventCard({
  next,
  canCheckInNow,
  t,
  locale,
}: {
  next: MyRegistration | undefined;
  canCheckInNow: boolean;
  t: T;
  locale: Locale;
}) {
  const accent = canCheckInNow ? KEHAI : SHU;
  return (
    <div className={`relative overflow-hidden rounded-[26px] border p-5 ${canCheckInNow ? "border-kehai-500/25" : "border-white/[0.07]"}`}>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(130% 110% at 100% 0%, ${accent}1f, transparent 58%), linear-gradient(180deg, #0c0e14, #08090d)`,
        }}
      />
      <span className="flex items-center gap-2">
        {canCheckInNow && <PulseDot />}
        <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${canCheckInNow ? "text-kehai-300" : "text-white/35"}`}>
          {canCheckInNow ? t("home.checkInWindowOpen") : t("home.nextEventHeading")}
        </span>
      </span>

      {next ? (
        <>
          <h2 className="mt-2 font-display text-[22px] font-black leading-tight text-white">{next.event.name}</h2>
          <p className="mt-1.5 text-[13px] text-white/45">{formatDate(next.event.startsAt, locale)}</p>
          <p className="mt-0.5 text-[13px] text-white/35">{next.event.venue}</p>
          <Link href={canCheckInNow ? `/attend/${next.event.id}` : `/events/${next.event.id}`} className="mt-5 block">
            <Button size="md" variant={canCheckInNow ? "cyan" : "secondary"} className="w-full">
              {canCheckInNow ? t("home.checkInNow") : t("common.viewArrow")}
            </Button>
          </Link>
        </>
      ) : (
        <>
          <h2 className="mt-2 font-display text-[22px] font-black leading-tight text-white">{t("home.nextEventNone")}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/35">{t("home.nextEventNoneHint")}</p>
          <Link href="/events" className="mt-5 block">
            <Button size="md" variant="secondary" className="w-full">
              {t("nav.discover")}
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Org                                                                 */
/* ------------------------------------------------------------------ */

function OrgSection({
  overview,
  slug,
  name,
  t,
  locale,
}: {
  overview: OrgOverview;
  slug: string;
  name: string;
  t: T;
  locale: Locale;
}) {
  const events = overview.events.slice(0, 4);
  return (
    <section>
      <SectionHead
        title={name}
        action={
          <Link href={`/orgs/${slug}`} className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-shu-300">
            {t("home.viewAll")} →
          </Link>
        }
      />
      <MetricStrip
        items={[
          { value: overview.totalEvents, label: t("orgDetail.statEvents") },
          { value: overview.totalAttendance, label: t("orgDetail.statAttendance") },
          { value: `${Math.round((overview.averageAttendanceRate ?? 0) * 100)}%`, label: t("home.avgRateLabel") },
        ]}
      />
      <div className={`${SURFACE} mt-3 divide-y divide-white/[0.05] overflow-hidden`}>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-white/35">{t("home.nextEventNone")}</p>
        ) : (
          events.map((e) => (
            <Link key={e.id} href={`/orgs/${slug}/events/${e.id}`} className="block px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-[14px] font-semibold text-white/85">{e.name}</p>
                <span className="shrink-0 font-mono text-[13px] font-bold text-white">{Math.round(e.attendanceRate * 100)}%</span>
              </div>
              <div className="mt-2">
                <Meter value={e.attendanceRate} accent={SHU} />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-white/30">
                {formatDate(e.startsAt, locale)} · {e.attendance}/{e.registrations}
              </p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function GetStarted({ t }: { t: T }) {
  return (
    <div className={`${SURFACE} px-6 py-10 text-center`}>
      <p className="font-display text-lg font-bold text-white">{t("home.getStartedTitle")}</p>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-white/40">{t("home.getStartedHint")}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/events">
          <Button size="sm" variant="primary">
            {t("nav.discover")}
          </Button>
        </Link>
        <Link href="/classrooms/join">
          <Button size="sm" variant="secondary">
            {t("nav.classrooms")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared widgets                                                      */
/* ------------------------------------------------------------------ */

// A contribution grid, drawn from the same heatmap endpoint the classroom
// page uses. It renders its full frame even with zero sessions on record,
// which is the point: an empty grid still reads as a designed instrument,
// whereas hiding the widget leaves the dead space that made this page
// feel unfinished on a near-empty account.
const HEATMAP_WEEKS = 17;
const LEVEL_BG = ["bg-white/[0.045]", "bg-kehai-500/25", "bg-kehai-500/45", "bg-kehai-500/70", "bg-kehai-400"];

function HeatmapSection({ classroomId, t }: { classroomId: string; t: T }) {
  const { data } = useClassroomHeatmap(classroomId);
  const days = data?.days ?? [];

  // Offset the first column to the right weekday, then pad out to a full
  // rectangle so the grid is never a ragged half-row.
  const lead = days.length > 0 ? new Date(days[0].date).getDay() : 0;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...days.map((d) => d.level)];
  const target = Math.max(HEATMAP_WEEKS * 7, Math.ceil(cells.length / 7) * 7);
  while (cells.length < target) cells.push(days.length > 0 ? 0 : null);

  return (
    <section>
      <SectionHead title={t("home.attendanceMap")} />
      <div className={`${SURFACE} p-4`}>
        <div className="scroll-thin -mx-1 overflow-x-auto px-1 pb-1">
          <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "repeat(7, 12px)", gridAutoColumns: "12px" }}>
            {cells.map((level, i) => (
              <span key={i} className={`rounded-[3px] ${level === null ? "bg-white/[0.02]" : LEVEL_BG[level]}`} aria-hidden />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/25">{t("home.mapLess")}</span>
          {LEVEL_BG.map((bg, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${bg}`} aria-hidden />
          ))}
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/25">{t("home.mapMore")}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-3.5">
          <MiniStat value={data?.currentStreak ?? 0} label={t("home.mapCurrent")} accent="text-shu-300" />
          <MiniStat value={data?.longestStreak ?? 0} label={t("home.mapLongest")} accent="text-white" />
          <MiniStat
            value={`${data?.presentCount ?? 0}/${data?.totalSessions ?? 0}`}
            label={t("home.mapSessions")}
            accent="text-kehai-300"
          />
        </div>
      </div>
    </section>
  );
}

function MiniStat({ value, label, accent }: { value: React.ReactNode; label: string; accent: string }) {
  return (
    <div className="text-center">
      <div className={`font-mono text-[15px] font-black tabular-nums leading-none ${accent}`}>{value}</div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">{label}</div>
    </div>
  );
}

function TrendCard({
  bars,
  accent,
  emptyLabel,
}: {
  bars: { value: number; count: number; label: string }[];
  accent: string;
  emptyLabel: string;
}) {
  // The plot frame — gridlines and a baseline — is always drawn, so an
  // empty chart reads as "no data yet" inside a real chart rather than as
  // a blank box.
  return (
    <div className={`${SURFACE} p-4`}>
      <div className="relative h-24">
        {[0, 0.5, 1].map((g) => (
          <span
            key={g}
            aria-hidden
            className="absolute inset-x-0 border-t border-dashed border-white/[0.06]"
            style={{ top: `${g * 100}%` }}
          />
        ))}
        {bars.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[13px] text-white/30">{emptyLabel}</p>
          </div>
        ) : (
          <div className="flex h-full items-end gap-1.5">
            {bars.map((b, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-[4px] transition-[height] duration-500"
                style={{ height: `${Math.max(b.value * 100, 3)}%`, background: `linear-gradient(180deg, ${accent}, ${accent}33)` }}
              />
            ))}
          </div>
        )}
      </div>
      {bars.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {bars.map((b, i) => (
            <span key={i} className="flex-1 text-center font-mono text-[9px] text-white/25">
              {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

