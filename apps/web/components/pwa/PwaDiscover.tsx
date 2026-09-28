"use client";

import { useMemo, useState } from "react";
import { Link } from "next-view-transitions";
import type { EventSummary } from "@/lib/types";
import { Icon, PwaScreen } from "./shared";

type T = (key: string, vars?: Record<string, string | number>) => string;
type Filter = "all" | "week" | "live" | "going";

const AVATAR_COLORS = ["#ff5c73", "#22e2f5", "#7d5cff"];

// The approved mockup's Discover artboard, 1:1, over the real public event list.
export function PwaDiscover({
  t,
  locale,
  events,
  isLoading,
}: {
  t: T;
  locale: "en" | "ja";
  events: EventSummary[] | undefined;
  isLoading: boolean;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const weekOut = Date.now() + 7 * 24 * 3600 * 1000;
    return (events ?? [])
      .filter((e) => {
        if (filter === "week" && new Date(e.startsAt).getTime() > weekOut) return false;
        if (filter === "live" && e.status !== "ACTIVE") return false;
        if (filter === "going" && !e.isRegistered) return false;
        if (!needle) return true;
        return (
          e.name.toLowerCase().includes(needle) ||
          e.venue.toLowerCase().includes(needle) ||
          (e.organization?.name.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [events, q, filter]);

  const intl = locale === "ja" ? "ja-JP" : "en-US";
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: t("pwa.filterAll") },
    { id: "week", label: t("pwa.filterWeek") },
    { id: "live", label: t("pwa.filterLive") },
    { id: "going", label: t("pwa.filterGoing") },
  ];

  return (
    <PwaScreen tight>
      <div className="pwa-head">
        <h1>{t("nav.discover")}</h1>
        <p>{t("pwa.discoverSub")}</p>
      </div>

      <label className="pwa-search">
        {Icon.search}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("pwa.searchEvents")} aria-label={t("pwa.searchEvents")} />
      </label>

      <div className="pwa-chips">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`pwa-chip ${filter === c.id ? "pwa-on" : "pwa-off"}`}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="pwa-feed-list">
        {isLoading && !events ? (
          <>
            <div className="pwa-panel" style={{ height: 106, opacity: 0.5 }} />
            <div className="pwa-panel" style={{ height: 106, opacity: 0.4 }} />
            <div className="pwa-panel" style={{ height: 106, opacity: 0.3 }} />
          </>
        ) : filtered.length === 0 ? (
          <div className="pwa-panel">
            <p className="pwa-empty">{t("pwa.noEvents")}</p>
          </div>
        ) : (
          filtered.map((e) => {
            const d = new Date(e.startsAt);
            const regs = e._count.registrations;
            return (
              <Link key={e.id} href={`/events/${e.id}`} className="pwa-panel pwa-ecard">
                <div className="pwa-edate">
                  <b>{new Intl.DateTimeFormat(intl, { day: "2-digit" }).format(d).replace(/\D/g, "")}</b>
                  <span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(d)}</span>
                </div>
                <div className="pwa-ebody">
                  {e.organization?.name && <div className="pwa-eorg">{e.organization.name}</div>}
                  <h3 className="pwa-etitle">{e.name}</h3>
                  <div className="pwa-emeta">
                    {new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit" }).format(d)} · {e.venue}
                  </div>
                  <div className="pwa-efoot">
                    {regs > 0 && (
                      <div className="pwa-avatars" aria-hidden>
                        {AVATAR_COLORS.slice(0, Math.min(3, regs)).map((c) => (
                          <span key={c} style={{ background: c }} />
                        ))}
                      </div>
                    )}
                    {regs > 0 && <span className="pwa-ecount">{regs}</span>}
                    <span className={`pwa-rsvp ${e.isRegistered ? "pwa-going" : ""}`}>
                      {e.isRegistered ? t("eventDiscover.going") : t("eventDiscover.rsvp")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </PwaScreen>
  );
}
