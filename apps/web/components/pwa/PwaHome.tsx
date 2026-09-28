"use client";

import { useState, type ReactNode } from "react";
import { Link, useTransitionRouter as useRouter } from "next-view-transitions";
import { apiFetch, ApiError } from "@/lib/api";
import { useClassroom, useClassroomHeatmap, useClassroomRoster, useClassroomSessions } from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import type { ClassroomSummary, EnrolledClassroom, MyRegistration, OrgOverview } from "@/lib/types";
import { PwaBell } from "./notifications";
import { Icon, PwaDial, PwaHeat, PwaScreen, lastHeatLevels, shortDate } from "./shared";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Locale = "en" | "ja";

type Row = { key: string; href: string; icon: string; title: string; sub: string; pct?: string };

// The approved mockup's Home artboard, rebuilt 1:1 and fed with real data.
// One layout for every role -- teacher, attendee, organizer, or brand new --
// the content of each block just changes with what the account actually has.
export function PwaHome({
  t,
  locale,
  userName,
  signedIn,
  registrations,
  enrolled,
  teaching,
  org,
  orgOverview,
}: {
  t: T;
  locale: Locale;
  userName: string | null;
  signedIn: boolean;
  registrations: MyRegistration[] | undefined;
  enrolled: EnrolledClassroom[] | undefined;
  teaching: ClassroomSummary[] | undefined;
  org: { slug: string; name: string } | undefined;
  orgOverview: OrgOverview | undefined;
}) {
  const router = useRouter();
  const primary = teaching?.[0];
  const { data: detail } = useClassroom(primary?.id);
  const { data: sessions } = useClassroomSessions(primary?.id);
  const isLive = !!detail?.openSession;
  const { data: roster } = useClassroomRoster(isLive ? primary?.id : undefined);

  const upcoming = (registrations ?? [])
    .filter((r) => new Date(r.event.endsAt) >= new Date() && r.event.status !== "CANCELLED")
    .sort((a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime());
  const enrolledList = enrolled ?? [];
  const best = enrolledList.reduce<EnrolledClassroom | null>((b, e) => (!b || e.currentStreak > b.currentStreak ? e : b), null);

  const role: "teacher" | "attendee" | "org" | "none" = primary
    ? "teacher"
    : enrolledList.length > 0 || upcoming.length > 0
      ? "attendee"
      : org && orgOverview
        ? "org"
        : "none";

  const heatClassroomId = role === "teacher" ? primary?.id : role === "attendee" ? best?.classroom.id : undefined;
  const { data: heat } = useClassroomHeatmap(heatClassroomId);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function startSession() {
    if (!primary) return;
    setStarting(true);
    setStartError(null);
    try {
      await apiFetch(`/api/classrooms/${primary.id}/sessions`, { method: "POST", body: JSON.stringify({}) });
      router.push(`/classrooms/${primary.id}/live`);
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : t("pwa.startError"));
      setStarting(false);
    }
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("home.greetingMorning") : hour < 18 ? t("home.greetingAfternoon") : t("home.greetingEvening");
  const intl = locale === "ja" ? "ja-JP" : "en-US";
  const dateLabel = `${new Intl.DateTimeFormat(intl, { month: "short", day: "numeric", year: "numeric" }).format(now)} · ${new Intl.DateTimeFormat(intl, { weekday: "long" }).format(now)}`;
  const firstName = userName?.split(" ")[0] ?? "";

  // ----- hero / stats / list content, per role -----
  let hero: {
    live: boolean;
    label: string;
    title: string;
    sub: string;
    dialValue: ReactNode;
    dialLabel: string;
    dialRatio: number;
    dialAccent?: string;
    cta: ReactNode;
  };
  let stats: { value: ReactNode; label: string }[] = [];
  let listTitle = "";
  let listHref: string | null = null;
  let rows: Row[] = [];

  const ctaInner = (label: string) => (
    <>
      {Icon.qr}
      {label}
    </>
  );

  if (role === "teacher" && primary) {
    const studentCount = detail?.studentCount ?? primary.studentCount;
    const present = (roster ?? []).filter((r) => r.checkedInOpenSession).length;
    const closed = (sessions ?? [])
      .filter((s) => s.status === "CLOSED")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const avgRate =
      closed.length > 0 && studentCount > 0
        ? closed.reduce((sum, s) => sum + Math.min(s.presentCount / studentCount, 1), 0) / closed.length
        : 0;
    const subParts = [primary.courseCode, closed[0] ? t("home.lastSessionOn", { date: shortDate(closed[0].date, locale) }) : null].filter(Boolean);

    hero = {
      live: isLive,
      label: isLive ? t("home.sessionLive") : t("home.sessionIdle"),
      title: primary.name,
      sub: subParts.join(" · ") || t("home.noSessionsYet"),
      dialValue: present,
      dialLabel: t("pwa.live"),
      dialRatio: studentCount > 0 ? present / studentCount : 0,
      dialAccent: isLive ? "#22e2f5" : "#ff2d55",
      cta: isLive ? (
        <Link className="pwa-cta pwa-cyan" href={`/classrooms/${primary.id}/live`}>
          {ctaInner(t("pwa.openControlRoom"))}
        </Link>
      ) : (
        <button type="button" className="pwa-cta" onClick={startSession} disabled={starting}>
          {ctaInner(starting ? t("pwa.starting") : t("pwa.startSession"))}
        </button>
      ),
    };
    stats = [
      { value: studentCount, label: t("pwa.students") },
      { value: sessions?.length ?? primary.sessionCount, label: t("home.sessionsLabel") },
      { value: `${Math.round(avgRate * 100)}%`, label: t("home.avgRateLabel") },
    ];
    listTitle = t("pwa.recentSessions");
    listHref = `/classrooms/${primary.id}`;
    rows = closed.slice(0, 3).map((s) => ({
      key: s.id,
      href: `/classrooms/${primary.id}`,
      icon: "🎓",
      title: s.label || t("classroomDetail.untitledSession"),
      sub: `${shortDate(s.date, locale)} · ${t("pwa.studentsCount", { count: s.presentCount })}`,
      pct: studentCount > 0 ? `${Math.round(Math.min(s.presentCount / studentCount, 1) * 100)}%` : undefined,
    }));
  } else if (role === "attendee") {
    const next = upcoming[0];
    const win = next ? getCheckInWindow(next.event) : null;
    const canCheckIn = !!next && !next.attended && win?.status === "open";
    const totals = enrolledList.reduce((a, e) => ({ p: a.p + e.presentDays, n: a.n + e.totalDays }), { p: 0, n: 0 });
    const rate = totals.n > 0 ? totals.p / totals.n : 0;

    hero = {
      live: canCheckIn,
      label: canCheckIn ? t("pwa.checkInOpen") : t("pwa.nextEvent"),
      title: next ? next.event.name : t("home.nextEventNone"),
      sub: next ? `${next.event.venue} · ${shortDate(next.event.startsAt, locale)}` : t("home.nextEventNoneHint"),
      dialValue: best?.currentStreak ?? 0,
      dialLabel: t("pwa.streak"),
      dialRatio: rate,
      dialAccent: "#22e2f5",
      cta: canCheckIn ? (
        <Link className="pwa-cta pwa-cyan" href={`/attend/${next!.event.id}`}>
          {ctaInner(t("pwa.checkIn"))}
        </Link>
      ) : next ? (
        <Link className="pwa-cta" href={`/events/${next.event.id}`}>
          {ctaInner(t("pwa.viewEvent"))}
        </Link>
      ) : (
        <Link className="pwa-cta" href="/events">
          {ctaInner(t("pwa.discoverEvents"))}
        </Link>
      ),
    };
    stats = [
      { value: enrolledList.length, label: t("pwa.classes") },
      { value: best?.currentStreak ?? 0, label: t("pwa.streak") },
      { value: `${Math.round(rate * 100)}%`, label: t("pwa.rate") },
    ];
    if (enrolledList.length > 0) {
      listTitle = t("pwa.yourClasses");
      listHref = "/classrooms";
      rows = enrolledList.slice(0, 4).map((e) => ({
        key: e.classroom.id,
        href: `/classrooms/${e.classroom.id}`,
        icon: "🎓",
        title: e.classroom.name,
        sub: `${e.classroom.teacherName} · ${e.presentDays}/${e.totalDays}`,
        pct: `${Math.round(e.attendanceRate * 100)}%`,
      }));
    } else {
      listTitle = t("pwa.upcoming");
      listHref = "/my-events";
      rows = upcoming.slice(1, 4).map((r) => ({
        key: r.event.id,
        href: `/events/${r.event.id}`,
        icon: "📅",
        title: r.event.name,
        sub: `${shortDate(r.event.startsAt, locale)} · ${r.event.venue}`,
      }));
    }
  } else if (role === "org" && org && orgOverview) {
    hero = {
      live: false,
      label: t("pwa.events"),
      title: org.name,
      sub: t("pwa.studentsCount", { count: orgOverview.totalAttendance }),
      dialValue: orgOverview.totalEvents,
      dialLabel: t("pwa.events"),
      dialRatio: orgOverview.averageAttendanceRate ?? 0,
      cta: (
        <Link className="pwa-cta" href={`/orgs/${org.slug}`}>
          {ctaInner(t("pwa.openConsole"))}
        </Link>
      ),
    };
    stats = [
      { value: orgOverview.totalEvents, label: t("pwa.events") },
      { value: orgOverview.totalAttendance, label: t("pwa.attendance") },
      { value: `${Math.round((orgOverview.averageAttendanceRate ?? 0) * 100)}%`, label: t("home.avgRateLabel") },
    ];
  } else {
    hero = {
      live: false,
      label: signedIn ? t("pwa.getStartedTitle") : t("nav.signIn"),
      title: signedIn ? t("pwa.getStartedTitle") : t("home.signInPrompt"),
      sub: t("pwa.getStartedSub"),
      dialValue: 0,
      dialLabel: t("pwa.live"),
      dialRatio: 0,
      cta: signedIn ? (
        <Link className="pwa-cta" href="/events">
          {ctaInner(t("pwa.discoverEvents"))}
        </Link>
      ) : (
        <Link className="pwa-cta" href="/login">
          {ctaInner(t("nav.signIn"))}
        </Link>
      ),
    };
    stats = [
      { value: 0, label: t("pwa.classes") },
      { value: 0, label: t("pwa.events") },
      { value: "0%", label: t("pwa.rate") },
    ];
  }

  // Organizers who also teach or attend still get their console from Home.
  const orgRows: Row[] =
    role !== "org" && org && orgOverview
      ? orgOverview.events.slice(0, 3).map((e) => ({
          key: e.id,
          href: `/orgs/${org.slug}/events/${e.id}`,
          icon: "📅",
          title: e.name,
          sub: `${shortDate(e.startsAt, locale)} · ${e.attendance}/${e.registrations}`,
          pct: `${Math.round(e.attendanceRate * 100)}%`,
        }))
      : [];
  if (role === "org" && org && orgOverview) {
    listTitle = t("pwa.recentEvents");
    listHref = `/orgs/${org.slug}`;
    rows = orgOverview.events.slice(0, 3).map((e) => ({
      key: e.id,
      href: `/orgs/${org.slug}/events/${e.id}`,
      icon: "📅",
      title: e.name,
      sub: `${shortDate(e.startsAt, locale)} · ${e.attendance}/${e.registrations}`,
      pct: `${Math.round(e.attendanceRate * 100)}%`,
    }));
  }

  return (
    <PwaScreen>
      <div className="pwa-topline">
        <div className="pwa-brand">
          <div className="pwa-mark">気</div>
          <span className="pwa-wordmark">KEHAI</span>
        </div>
        <PwaBell />
      </div>

      <div>
        <p className="pwa-greet-label">{dateLabel}</p>
        <h1 className="pwa-greet">
          {greeting},
          {firstName && (
            <>
              <br />
              <b>{firstName}</b>
            </>
          )}
        </h1>
      </div>

      <div className="pwa-panel pwa-hero">
        <div className="pwa-hero-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={`pwa-hero-label ${hero.live ? "pwa-live" : ""}`}>
              <span className="pwa-dot" />
              {hero.label}
            </div>
            <h2 className="pwa-hero-title">{hero.title}</h2>
            <p className="pwa-hero-sub">{hero.sub}</p>
          </div>
          <PwaDial value={hero.dialValue} label={hero.dialLabel} ratio={hero.dialRatio} accent={hero.dialAccent} />
        </div>
        {hero.cta}
        {startError && <p className="pwa-error">{startError}</p>}
      </div>

      <div className="pwa-stat-row">
        {stats.map((s, i) => (
          <div key={s.label} className={`pwa-panel pwa-stat ${i === 2 ? "pwa-accent" : ""}`}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {heatClassroomId && (
        <div>
          <div className="pwa-section-head">
            <h2>{t("home.attendanceMap")}</h2>
          </div>
          <PwaHeat levels={lastHeatLevels(heat?.days)} lessLabel={t("home.mapLess")} moreLabel={t("home.mapMore")} />
        </div>
      )}

      {listTitle && <PwaList title={listTitle} href={listHref} rows={rows} t={t} />}
      {orgRows.length > 0 && org && <PwaList title={org.name} href={`/orgs/${org.slug}`} rows={orgRows} t={t} />}
    </PwaScreen>
  );
}

function PwaList({ title, href, rows, t }: { title: string; href: string | null; rows: Row[]; t: T }) {
  return (
    <div>
      <div className="pwa-section-head">
        <h2>{title}</h2>
        {href && <Link href={href}>{t("pwa.seeAll")}</Link>}
      </div>
      <div className="pwa-panel pwa-list">
        {rows.length === 0 ? (
          <p className="pwa-empty">{t("pwa.nothingYet")}</p>
        ) : (
          rows.map((r) => (
            <Link key={r.key} href={r.href} className="pwa-list-row">
              <div className="pwa-list-dot">{r.icon}</div>
              <div className="pwa-list-body">
                <p className="pwa-list-title">{r.title}</p>
                <p className="pwa-list-sub">{r.sub}</p>
              </div>
              {r.pct && <span className="pwa-list-pct">{r.pct}</span>}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
