"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useEnrolledClassrooms, useMyClassrooms, useMyRegistrations } from "@/lib/hooks";
import { getCheckInWindow } from "@/lib/checkin-window";
import { useLocale } from "@/lib/i18n";
import type { ClassroomDetail } from "@/lib/types";
import { Icon } from "./shared";

export type PwaNotification = {
  id: string;
  tone: "live" | "open" | "soon";
  title: string;
  body: string;
  href: string;
  at: number;
};

const SEEN_KEY = "kehai.notif.seen";
const ANNOUNCED_KEY = "kehai.notif.announced";

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}
function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-200)));
  } catch {
    // storage full / private mode: badge just won't persist
  }
}

// Everything worth interrupting someone for, derived from data the app
// already has: a class session that's open right now (for students, a
// check-in; for teachers, their own live session), an event whose
// check-in window is open, and an event starting within 24 hours.
export function usePwaNotifications(): PwaNotification[] {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { data: registrations } = useMyRegistrations(!!user);
  const { data: enrolled } = useEnrolledClassrooms();
  const { data: teaching } = useMyClassrooms();

  const ids = useMemo(
    () => [...(enrolled ?? []).map((e) => e.classroom.id), ...(teaching ?? []).map((c) => c.id)].slice(0, 12),
    [enrolled, teaching]
  );
  const { data: details } = useSWR<ClassroomDetail[]>(
    user && ids.length ? ["pwa-notif-classrooms", ...ids] : null,
    () => Promise.all(ids.map((id) => apiFetch<ClassroomDetail>(`/api/classrooms/${id}`).catch(() => null))).then((r) => r.filter(Boolean) as ClassroomDetail[]),
    { refreshInterval: 30_000 }
  );

  return useMemo(() => {
    if (!user) return [];
    const out: PwaNotification[] = [];
    const now = Date.now();
    for (const c of details ?? []) {
      if (!c.openSession) continue;
      const at = new Date(c.openSession.date).getTime() || now;
      out.push(
        c.isTeacher
          ? { id: `tch-${c.openSession.id}`, tone: "live", title: t("pwa.nTeachLive", { name: c.name }), body: t("pwa.nTeachLiveBody"), href: `/classrooms/${c.id}/live`, at }
          : { id: `cls-${c.openSession.id}`, tone: "open", title: t("pwa.nClassOpen", { name: c.name }), body: t("pwa.nClassOpenBody"), href: `/classrooms/${c.id}/checkin`, at }
      );
    }
    for (const r of registrations ?? []) {
      if (r.attended || r.event.status === "CANCELLED") continue;
      const start = new Date(r.event.startsAt).getTime();
      const win = getCheckInWindow(r.event);
      if (win.status === "open") {
        out.push({ id: `evt-open-${r.event.id}`, tone: "open", title: t("pwa.nEventOpen", { name: r.event.name }), body: r.event.venue, href: `/attend/${r.event.id}`, at: win.opensAt.getTime() });
      } else if (win.status === "not_open" && start - now < 24 * 3600_000) {
        const when = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }).format(start);
        out.push({ id: `evt-soon-${r.event.id}`, tone: "soon", title: t("pwa.nEventSoon", { name: r.event.name }), body: `${when} · ${r.event.venue}`, href: `/events/${r.event.id}`, at: start - 24 * 3600_000 });
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }, [user, details, registrations, t, locale]);
}

// Mounted once (with the dock) while the installed app is open: registers
// the service worker and raises a system notification the first time each
// item appears, if the user has allowed notifications.
export function PwaNotifier() {
  const items = usePwaNotifications();
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!items.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const announced = readSet(ANNOUNCED_KEY);
    const fresh = items.filter((n) => !announced.has(n.id));
    if (!fresh.length) return;
    fresh.forEach((n) => announced.add(n.id));
    writeSet(ANNOUNCED_KEY, announced);
    navigator.serviceWorker?.ready
      .then((reg) =>
        fresh.forEach((n) =>
          reg.showNotification(n.title, { body: n.body, tag: n.id, icon: "/icons/kehai-192.png", badge: "/icons/kehai-badge-96.png", data: { url: n.href } })
        )
      )
      .catch(() => {});
  }, [items]);
  return null;
}

// The Home bell: unread badge + a bottom sheet inbox, like any app's.
export function PwaBell() {
  const { t } = useLocale();
  const router = useRouter();
  const items = usePwaNotifications();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setSeen(readSet(SEEN_KEY));
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const unread = items.filter((n) => !seen.has(n.id)).length;

  const openSheet = useCallback(() => {
    setOpen(true);
    const next = new Set(seen);
    items.forEach((n) => next.add(n.id));
    writeSet(SEEN_KEY, next);
    setSeen(next);
  }, [items, seen]);

  async function enable() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
      await navigator.serviceWorker.ready;
      reg?.showNotification(t("pwa.nEnabledTitle"), { body: t("pwa.nEnabledBody"), icon: "/icons/kehai-192.png", badge: "/icons/kehai-badge-96.png", tag: "kehai-enabled" });
    }
  }

  return (
    <>
      <button type="button" className="pwa-bell" aria-label={t("pwa.notifications")} onClick={openSheet}>
        {Icon.bell}
        {unread > 0 && <span className="pwa-bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open &&
        createPortal(
          <div className="pwa-sheet-backdrop" onClick={() => setOpen(false)}>
            <div className="pwa-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("pwa.notifications")}>
              <div className="pwa-sheet-grip" />
              <div className="pwa-sheet-head">
                <h2>{t("pwa.notifications")}</h2>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("pwa.closeQr")}>
                  ✕
                </button>
              </div>
              {perm === "default" && (
                <button type="button" className="pwa-sheet-enable" onClick={enable}>
                  <b>{t("pwa.nEnable")}</b>
                  <span>{t("pwa.nEnableSub")}</span>
                </button>
              )}
              {perm === "denied" && <p className="pwa-sheet-note">{t("pwa.nDenied")}</p>}
              {items.length === 0 ? (
                <p className="pwa-empty">{t("pwa.nEmpty")}</p>
              ) : (
                <div className="pwa-sheet-list">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="pwa-sheet-item"
                      onClick={() => {
                        setOpen(false);
                        router.push(n.href);
                      }}
                    >
                      <span className={`pwa-sheet-dot pwa-t-${n.tone}`} />
                      <span className="pwa-sheet-text">
                        <b>{n.title}</b>
                        <span>{n.body}</span>
                      </span>
                      <span className="pwa-sheet-go">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
