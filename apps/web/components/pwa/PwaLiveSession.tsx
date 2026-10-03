"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { apiFetch, ApiError } from "@/lib/api";
import { useClassroom, useClassroomRoster, useClassroomSessions } from "@/lib/hooks";
import { subscribeToClassroom } from "@/lib/realtime";
import { formatCountdown } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { haptic } from "@/lib/haptics";
import { AVATAR_TINTS, Icon, PwaLoading, PwaScreen, initials } from "./shared";
import { RotationSheet, formatPeriod } from "./RotationSheet";

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

  // How often the code changes. The server starts a fresh code the moment
  // the period changes, so refetch straight away rather than waiting out
  // the old countdown.
  const [rotationOpen, setRotationOpen] = useState(false);
  const [savingRotation, setSavingRotation] = useState(false);
  const [rotationError, setRotationError] = useState<string | null>(null);
  async function changeRotation(seconds: number) {
    if (!openSession) return;
    if (seconds === qr?.rotationSeconds) {
      setRotationOpen(false);
      return;
    }
    setSavingRotation(true);
    setRotationError(null);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${openSession.id}`, {
        method: "PATCH",
        body: JSON.stringify({ qrRotationSeconds: seconds }),
      });
      await fetchQr();
      void mutateSessions();
      haptic("success");
      setRotationOpen(false);
    } catch (err) {
      haptic("error");
      setRotationError(err instanceof ApiError ? err.message : t("pwa.rotationError"));
    } finally {
      setSavingRotation(false);
    }
  }

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

  // Student dots: one per checked-in student (up to 24), inside the dial at
  // a stable angle and distance derived from their id, so they never jump.
  const dots = present.slice(0, 24).map((r, i) => {
    let h = 0;
    for (const ch of r.student.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const angle = ((h % 360) * Math.PI) / 180;
    const radius = 38 + ((h >> 9) % 34);
    return { key: r.student.id, x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius, fresh: i === 0 };
  });

  // The dial's arc is real data: the share of enrolled students in.
  const enrolled = classroom.studentCount ?? 0;
  const ratio = enrolled > 0 ? Math.min(1, present.length / enrolled) : 0;
  const ARC_R = 84;
  const arcLength = 2 * Math.PI * ARC_R;
  const arcEnd = { x: 100 + Math.sin(ratio * 2 * Math.PI) * ARC_R, y: 100 - Math.cos(ratio * 2 * Math.PI) * ARC_R };
  // Inner ring: what's left of the current QR window, draining to the next rotation.
  const QR_R = 74;
  const qrLength = 2 * Math.PI * QR_R;
  const qrLeft = qr && qr.rotationSeconds > 0 ? Math.min(1, Math.max(0, countdown / qr.rotationSeconds)) : 0;

  return (
    <PwaScreen withDock={false} tight>
      {topbar}

      <div className="pwa-panel pwa-live-hero">
        <div className="pwa-live-badge">
          <span className="pwa-pulse" />
          {t("pwa.liveNow")}
        </div>
        <div className="pwa-radar">
          {/* Sweeps inside the dial while the session listens for check-ins. */}
          <div className="pwa-radar-sweep" aria-hidden />
          <svg viewBox="0 0 200 200" aria-hidden>
            <defs>
              <radialGradient id="pwa-dial-disc" cx="50%" cy="50%" r="50%">
                <stop offset="0%" className="pwa-disc-in" />
                <stop offset="100%" className="pwa-disc-out" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="80" fill="url(#pwa-dial-disc)" />
            {/* Bezel: 60 fine ticks, every fifth longer, like a watch face.
                Ticks light up to the checked-in share, like a level meter. */}
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * 2 * Math.PI;
              const major = i % 5 === 0;
              const lit = ratio > 0 && i / 60 < ratio;
              const r1 = 98;
              const r2 = major ? 92 : 95;
              return (
                <line
                  key={i}
                  x1={100 + Math.sin(a) * r1}
                  y1={100 - Math.cos(a) * r1}
                  x2={100 + Math.sin(a) * r2}
                  y2={100 - Math.cos(a) * r2}
                  className={`pwa-tick${major ? " pwa-tick-major" : ""}${lit ? " pwa-tick-lit" : ""}`}
                />
              );
            })}
            {/* Range rings and crosshair marks for the dots. */}
            <circle cx="100" cy="100" r="58" fill="none" className="pwa-radar-guide" />
            <circle cx="100" cy="100" r="34" fill="none" className="pwa-radar-guide" />
            {[0, 90, 180, 270].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return (
                <line
                  key={deg}
                  x1={100 + Math.sin(a) * 36}
                  y1={100 - Math.cos(a) * 36}
                  x2={100 + Math.sin(a) * 56}
                  y2={100 - Math.cos(a) * 56}
                  className="pwa-crosshair"
                />
              );
            })}
            {/* QR window: drains to the next rotation (same cyan as the "Every …" chip). */}
            <circle cx="100" cy="100" r={QR_R} fill="none" className="pwa-qr-track" />
            <circle
              cx="100"
              cy="100"
              r={QR_R}
              fill="none"
              className="pwa-qr-ring"
              strokeDasharray={`${qrLength} ${qrLength}`}
              strokeDashoffset={qrLength * (1 - qrLeft)}
              transform="rotate(-90 100 100)"
            />
            {/* Attendance arc: track, then the checked-in share from 12 o'clock. */}
            <circle cx="100" cy="100" r={ARC_R} fill="none" className="pwa-arc-track" />
            <circle
              cx="100"
              cy="100"
              r={ARC_R}
              fill="none"
              className="pwa-arc"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={arcLength * (1 - ratio)}
              transform="rotate(-90 100 100)"
              style={{ opacity: ratio > 0 ? 1 : 0 }}
            />
            {ratio > 0 && ratio < 1 && <circle cx={arcEnd.x} cy={arcEnd.y} r="3.4" className="pwa-arc-head" />}
            {/* A ripple from the centre on every new check-in. */}
            {present.length > 0 && <circle key={present.length} cx="100" cy="100" r="30" fill="none" className="pwa-checkin-ripple" />}
            {dots.map((d) => (
              <g key={d.key}>
                {d.fresh && <circle cx={d.x} cy={d.y} r="4" className="pwa-dot-ping" style={{ transformOrigin: `${d.x}px ${d.y}px` }} />}
                <circle cx={d.x} cy={d.y} r={d.fresh ? 3.6 : 3} className="pwa-dot" opacity={d.fresh ? 1 : 0.7} />
              </g>
            ))}
          </svg>
          <div className="pwa-count">
            <strong>{present.length}</strong>
            <span>{t("pwa.checkedIn")}</span>
            {enrolled > 0 && (
              <em>
                {t("pwa.ofEnrolled", { n: enrolled })} · {Math.round(ratio * 100)}%
              </em>
            )}
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
          {qr && (
            <button
              type="button"
              className="pwa-rot-chip"
              onClick={() => {
                setRotationError(null);
                setRotationOpen(true);
              }}
              aria-label={t("pwa.rotationChange")}
            >
              {Icon.clock}
              {t("pwa.rotationEvery", { time: formatPeriod(qr.rotationSeconds) })}
              <span aria-hidden className="pwa-rot-caret">
                ▾
              </span>
            </button>
          )}
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

      {rotationOpen && qr && (
        <RotationSheet
          seconds={qr.rotationSeconds}
          saving={savingRotation}
          error={rotationError}
          onPick={changeRotation}
          onClose={() => setRotationOpen(false)}
        />
      )}

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
