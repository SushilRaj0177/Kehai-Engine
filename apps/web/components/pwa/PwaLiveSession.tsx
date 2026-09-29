"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { apiFetch, ApiError } from "@/lib/api";
import { useClassroom, useClassroomRoster, useClassroomSessions } from "@/lib/hooks";
import { subscribeToClassroom } from "@/lib/realtime";
import { formatCountdown } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { AVATAR_TINTS, Icon, PwaLoading, PwaScreen, initials } from "./shared";

interface QrResponse {
  dataUrl: string;
  expiresAt: string;
  rotationSeconds: number;
  secondsRemaining?: number;
  rotatesAt?: string;
}

// The approved mockup's Live Session artboard: a full-screen control room
// for the teacher while a class session is open. Real data throughout --
// the roster poll + realtime socket drive the count, the radar dots and the
// feed; the QR is the session's actual rotating code.
export function PwaLiveSession({ classroomId }: { classroomId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const { data: classroom, mutate: mutateClassroom } = useClassroom(classroomId);
  const { data: sessions, mutate: mutateSessions } = useClassroomSessions(classroom?.isTeacher ? classroomId : undefined);
  const { data: roster, mutate: mutateRoster } = useClassroomRoster(classroom?.isTeacher ? classroomId : undefined);
  const openSession = classroom?.openSession ?? null;
  const openedAt = sessions?.find((s) => s.status === "OPEN")?.openedAt;

  // Students aren't meant to be here -- send them to their own check-in.
  useEffect(() => {
    if (classroom && !classroom.isTeacher) router.replace(`/classrooms/${classroomId}/checkin`);
  }, [classroom, classroomId, router]);

  useEffect(() => {
    if (!classroom?.isTeacher) return;
    return subscribeToClassroom(classroomId, {
      onJoin: () => {
        void mutateRoster();
        void mutateClassroom();
      },
      onAttendanceUpdate: () => void mutateRoster(),
    });
  }, [classroomId, classroom?.isTeacher, mutateRoster, mutateClassroom]);

  // One clock for the elapsed timer and the feed's "Ns ago" labels.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Rotating QR, same endpoint and refresh rhythm as the classroom page's QR panel.
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const fetchQr = useCallback(async () => {
    if (!openSession) return;
    try {
      const data = await apiFetch<QrResponse>(`/api/classrooms/${classroomId}/sessions/${openSession.id}/qr`);
      setQr(data);
      // Count down what's left of the server's current window, not a fresh
      // full interval -- reloading mid-window keeps the same code and time.
      setCountdown(Math.min(86400, Math.max(1, data.secondsRemaining ?? data.rotationSeconds)));
    } catch {
      // keep the last good code on screen; the next tick retries
    }
  }, [classroomId, openSession]);
  useEffect(() => {
    setQr(null);
    void fetchQr();
  }, [fetchQr]);
  const qrRef = useRef(qr);
  qrRef.current = qr;
  useEffect(() => {
    if (!qr) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          void fetchQr();
          return qrRef.current?.rotationSeconds ?? 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [qr, fetchQr]);

  const [kiosk, setKiosk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endSession() {
    if (!openSession) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3500);
      return;
    }
    setEnding(true);
    setError(null);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${openSession.id}/close`, { method: "POST" });
      await Promise.all([mutateClassroom(), mutateSessions()]);
      router.push("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("pwa.endError"));
      setEnding(false);
      setConfirmEnd(false);
    }
  }

  function copyJoinLink() {
    if (!classroom?.joinCode) return;
    const link = `${window.location.origin}/classrooms/join?code=${classroom.joinCode}`;
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => undefined
    );
  }

  if (!classroom) return <PwaLoading />;

  const topbar = (
    <div className="pwa-topbar">
      <button type="button" className="pwa-back" aria-label={t("pwa.back")} onClick={() => router.push("/home")}>
        {Icon.back}
      </button>
      <div style={{ minWidth: 0 }}>
        <h1>{classroom.name}</h1>
        <div className="pwa-sub">{[classroom.courseCode, classroom.semesterLabel].filter(Boolean).join(" · ")}</div>
      </div>
    </div>
  );

  if (!openSession) {
    return (
      <PwaScreen withDock={false} tight>
        {topbar}
        <div className="pwa-panel pwa-live-hero">
          <p className="pwa-hero-sub" style={{ whiteSpace: "normal" }}>
            {t("pwa.noSessionOpen")}
          </p>
          <button type="button" className="pwa-cta" onClick={() => router.push("/home")}>
            {Icon.back}
            {t("pwa.back")}
          </button>
        </div>
      </PwaScreen>
    );
  }

  const present = (roster ?? [])
    .filter((r) => r.checkedInOpenSession)
    .sort((a, b) => new Date(b.lastAttendedAt ?? 0).getTime() - new Date(a.lastAttendedAt ?? 0).getTime());

  const elapsedSec = openedAt ? Math.max(0, Math.floor((now - new Date(openedAt).getTime()) / 1000)) : 0;
  const hh = Math.floor(elapsedSec / 3600);
  const mm = Math.floor((elapsedSec % 3600) / 60);
  const ss = elapsedSec % 60;
  const elapsed = hh > 0 ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;

  function ago(iso: string | null) {
    if (!iso) return "";
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    if (s < 10) return t("pwa.now");
    if (s < 60) return t("pwa.secondsAgo", { n: s });
    if (s < 3600) return t("pwa.minutesAgo", { n: Math.floor(s / 60) });
    return t("pwa.hoursAgo", { n: Math.floor(s / 3600) });
  }

  // Radar dots: one per checked-in student (up to 24), spread around the
  // rings at a stable angle derived from their id so they don't jump about.
  const dots = present.slice(0, 24).map((r, i) => {
    let h = 0;
    for (const ch of r.student.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const angle = ((h % 360) * Math.PI) / 180;
    const radius = 60 + ((h >> 9) % 28);
    return { key: r.student.id, x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius, fresh: i === 0 };
  });

  return (
    <PwaScreen withDock={false} tight>
      {topbar}

      <div className="pwa-panel pwa-live-hero">
        <div className="pwa-live-badge">
          <span className="pwa-pulse" />
          {t("pwa.liveNow")}
        </div>
        <div className="pwa-radar">
          <svg viewBox="0 0 200 200" aria-hidden>
            <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,0.05)" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,45,85,0.10)" />
            <circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,45,85,0.16)" />
            <circle
              className="pwa-radar-ring"
              cx="100"
              cy="100"
              r="94"
              fill="none"
              stroke="rgba(255,45,85,0.5)"
              strokeWidth="2"
              strokeDasharray="6 10"
              strokeLinecap="round"
            />
            {dots.map((d) => (
              <circle key={d.key} cx={d.x} cy={d.y} r="4" fill="#5ff4ff" opacity={d.fresh ? 1 : 0.85} />
            ))}
          </svg>
          <div className="pwa-count">
            <strong>{present.length}</strong>
            <span>{t("pwa.checkedIn")}</span>
          </div>
        </div>
        <div className="pwa-timer-row">
          {Icon.clock}
          {t("pwa.elapsed")} <b>{elapsed}</b> &nbsp;·&nbsp; {t("pwa.geofence")}{" "}
          <b>{classroom.hasGeofence && classroom.geofenceRadiusM ? `${classroom.geofenceRadiusM}m` : "—"}</b>
        </div>
      </div>

      <div className="pwa-panel pwa-qr-row">
        <button type="button" className="pwa-qr-box" onClick={() => qr && setKiosk(true)} aria-label={t("pwa.showQr")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr.dataUrl} alt="" /> : null}
        </button>
        <div className="pwa-qr-info">
          <h3>{t("pwa.scanToCheckIn")}</h3>
          <p>{qr ? t("pwa.rotatesIn", { time: formatCountdown(countdown) }) : "…"}</p>
        </div>
        <button type="button" className="pwa-qr-copy" onClick={copyJoinLink} aria-label={t("pwa.copyJoinLink")}>
          {copied ? Icon.check : Icon.copy}
        </button>
      </div>

      <div>
        <div className="pwa-feed-head">
          <h2>{t("pwa.liveFeed")}</h2>
          <span className="pwa-n">{t("pwa.inCount", { count: present.length })}</span>
        </div>
        <div className="pwa-panel pwa-feed">
          {present.length === 0 ? (
            <p className="pwa-empty">{t("pwa.noCheckIns")}</p>
          ) : (
            present.slice(0, 12).map((r, i) => {
              const fresh = i === 0 && !!r.lastAttendedAt && now - new Date(r.lastAttendedAt).getTime() < 60_000;
              const tint = AVATAR_TINTS[Math.min(i, 2)];
              return (
                <div key={r.student.id} className={`pwa-feed-row ${fresh ? "pwa-new" : ""}`}>
                  <div className="pwa-avatar" style={r.student.avatarUrl ? undefined : tint}>
                    {r.student.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.student.avatarUrl} alt="" />
                    ) : (
                      initials(r.student.name)
                    )}
                  </div>
                  <p className="pwa-feed-name">{r.student.name}</p>
                  <span className="pwa-feed-time">{ago(r.lastAttendedAt)}</span>
                  {Icon.check}
                </div>
              );
            })
          )}
        </div>
      </div>

      {error && <p className="pwa-error">{error}</p>}
      <div className="pwa-actions">
        <button type="button" className="pwa-btn pwa-ghost" onClick={() => setKiosk(true)} disabled={!qr}>
          {t("pwa.showQr")}
        </button>
        <button type="button" className="pwa-btn pwa-danger" onClick={endSession} disabled={ending}>
          {ending ? t("pwa.ending") : confirmEnd ? t("pwa.confirmEnd") : t("pwa.endSession")}
        </button>
      </div>

      {kiosk && qr && (
        <div className="pwa-kiosk" onClick={() => setKiosk(false)}>
          <button type="button" onClick={() => setKiosk(false)}>
            {t("pwa.closeQr")}
          </button>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#0a0e14" }}>{openSession.label || classroom.name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.dataUrl} alt={t("pwa.scanToCheckIn")} />
          <p>{t("pwa.rotatesIn", { time: formatCountdown(countdown) })}</p>
        </div>
      )}
    </PwaScreen>
  );
}
