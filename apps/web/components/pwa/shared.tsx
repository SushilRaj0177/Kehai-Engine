"use client";

import type { ReactNode } from "react";

// Shared pieces for the installed-PWA screens (components/pwa/*). Every
// class used here lives in app/pwa.css and is prefixed `pwa-`, so none of
// this can leak into the browser UI.

export function PwaScreen({
  children,
  withDock = true,
  tight = false,
}: {
  children: ReactNode;
  withDock?: boolean;
  tight?: boolean;
}) {
  return (
    <div className="pwa-screen">
      <div className="pwa-glows glow-layer" aria-hidden>
        <div className="pwa-glow-shu" />
        <div className="pwa-glow-kehai" />
      </div>
      <div
        className={`pwa-scroll pwa-rise ${withDock ? "pwa-with-dock" : ""} ${tight ? "pwa-gap-18" : ""}`}
        style={withDock ? undefined : { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        {children}
      </div>
      {withDock && <div className="pwa-bottomfade" aria-hidden />}
    </div>
  );
}

export function PwaLoading() {
  return (
    <PwaScreen>
      <div className="pwa-topline">
        <div className="pwa-brand">
          <div className="pwa-mark">気</div>
          <span className="pwa-wordmark">KEHAI</span>
        </div>
      </div>
      <div className="pwa-panel" style={{ height: 190, opacity: 0.6 }} />
      <div className="pwa-stat-row">
        <div className="pwa-panel" style={{ height: 70, opacity: 0.5 }} />
        <div className="pwa-panel" style={{ height: 70, opacity: 0.5 }} />
        <div className="pwa-panel" style={{ height: 70, opacity: 0.5 }} />
      </div>
    </PwaScreen>
  );
}

// The small 68px progress dial from the mockup's hero panel.
export function PwaDial({ value, label, ratio, accent = "#ff2d55" }: { value: ReactNode; label: string; ratio: number; accent?: string }) {
  const r = 29;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <div className="pwa-dial">
      <svg viewBox="0 0 68 68" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="34"
          cy="34"
          r={r}
          fill="none"
          stroke={accent}
          strokeOpacity={clamped > 0 ? 1 : 0.4}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="pwa-dial-num">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Heatmap level (0-4) -> cyan intensity, matching the mockup's legend.
export const HEAT_LEVELS = [0.07, 0.28, 0.52, 0.8, 1];

export function PwaHeat({ levels, lessLabel, moreLabel }: { levels: (number | null)[]; lessLabel: string; moreLabel: string }) {
  return (
    <div className="pwa-panel pwa-heat">
      <div className="pwa-heat-grid">
        {levels.map((level, i) => (
          <div
            key={i}
            className="pwa-heat-cell"
            style={{
              background: level === null ? "rgba(95,244,255,0.04)" : level >= 4 ? "#5ff4ff" : `rgba(95,244,255,${HEAT_LEVELS[level]})`,
            }}
          />
        ))}
      </div>
      <div className="pwa-legend">
        {lessLabel}
        {HEAT_LEVELS.map((a, i) => (
          <i key={i} style={{ background: i === 4 ? "#5ff4ff" : `rgba(95,244,255,${a})` }} />
        ))}
        {moreLabel}
      </div>
    </div>
  );
}

// Last 52 days of a heatmap (13 columns x 4 rows, as in the mockup),
// padded at the front when there's less history than that.
export function lastHeatLevels(days: { level: number }[] | undefined, count = 52): (number | null)[] {
  const tail = (days ?? []).slice(-count).map((d) => d.level);
  return [...Array(Math.max(0, count - tail.length)).fill(null), ...tail];
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

// Avatar tints cycle through the two brand accents then neutral, the way
// the mockup's feed rows do.
export const AVATAR_TINTS = [
  { background: "rgba(255,45,85,0.16)", color: "#ff8a9a" },
  { background: "rgba(95,244,255,0.14)", color: "#8fefff" },
  { background: "rgba(255,255,255,0.06)", color: "rgba(244,242,238,0.6)" },
];

export const Icon = {
  grid: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </svg>
  ),
  bell: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM19 14v3M14 19h3" />
    </svg>
  ),
  back: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  ),
  check: (
    <svg className="pwa-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 11.5L12 4l8 7.5" />
      <path d="M6 10v8.5a1 1 0 001 1h10a1 1 0 001-1V10" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polygon points="15,9 13,13 9,15 11,11" fill="currentColor" stroke="none" />
    </svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3M7 12h10" />
    </svg>
  ),
  cap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4.5l9 4.5-9 4.5-9-4.5z" />
      <path d="M6.5 11v4.5c0 1.2 2.5 3 5.5 3s5.5-1.8 5.5-3V11" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  ),
};

export function shortDate(iso: string, locale: "en" | "ja") {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}
