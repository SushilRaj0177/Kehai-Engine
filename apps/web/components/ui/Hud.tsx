"use client";

import { useEffect, useState } from "react";

// The shared visual vocabulary for the PWA's standalone-only pages (home
// dashboard, classroom detail, …): solid dark instrument panels, mono
// uppercase labels, and the two brand accents used as real color
// statements rather than muted borders. Extracted here so every page that
// carries this "vibe" draws from the exact same primitives instead of
// each reinventing (and slowly drifting from) its own copy.

export const SHU = "#ff2d55";
export const KEHAI = "#5ff4ff";

// One surface for the whole page: a solid dark panel on a dark ground,
// not a translucent white "glass" overlay. Cards read as physical pieces
// of an instrument panel instead of frosted sheets floating on a
// gradient.
export const SURFACE = "rounded-2xl border border-white/[0.07] bg-void-900/60";

export function SectionHead({ title, action, trailing }: { title: string; action?: React.ReactNode; trailing?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h2 className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{title}</h2>
      {trailing && <span className="shrink-0 font-mono text-[11px] font-bold text-white/50">{trailing}</span>}
      {action}
    </div>
  );
}

export function MetricStrip({ items }: { items: { value: React.ReactNode; label: string }[] }) {
  return (
    <div className={`${SURFACE} grid overflow-hidden divide-x divide-white/[0.06]`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item) => (
        <div key={item.label} className="px-2 py-3.5 text-center">
          <div className="font-mono text-[19px] font-black tabular-nums leading-none text-white">{item.value}</div>
          <div className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Meter({ value, accent }: { value: number; accent: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.max(Math.min(value, 1), 0) * 100}%`, background: accent }}
      />
    </div>
  );
}

export function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  // Alternate the two brand accents by name so a wall of avatars has some
  // life without pulling in colors from outside the palette.
  const warm = (name.charCodeAt(0) || 0) % 2 === 0;
  return (
    <span
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
        warm ? "bg-shu-500/15 text-shu-300" : "bg-kehai-500/15 text-kehai-300"
      }`}
    >
      {initials || "?"}
    </span>
  );
}

export function Dial({
  value,
  accent,
  active,
  size = 78,
  children,
}: {
  value: number;
  accent: string;
  active: boolean;
  size?: number;
  children: React.ReactNode;
}) {
  const strokeWidth = size >= 60 ? 5 : 4;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - (active ? clamped : 1))}
          style={active ? { filter: `drop-shadow(0 0 4px ${accent}99)` } : { opacity: 0.22 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function PulseDot({ accent = "bg-kehai-400" }: { accent?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${accent}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${accent}`} />
    </span>
  );
}

export function FlameIcon({ lit, size = 20 }: { lit: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={lit ? "#ff9142" : "none"}
      stroke={lit ? "none" : "rgba(255,255,255,0.35)"}
      strokeWidth="1.75"
    >
      <path d="M12 2c1 3-3 4-3 7.5a3 3 0 006 0c1.5 1 2.5 2.8 2.5 4.9A5.5 5.5 0 0112 20a5.5 5.5 0 01-5.5-5.6c0-4.2 3.4-5.9 5.5-12.4z" />
    </svg>
  );
}

// Starts null so the server and first client render agree — a live
// "running for 12m" readout can't be server-rendered without a hydration
// mismatch.
export function useElapsed(since: string | undefined): string | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!since) {
      setNow(null);
      return;
    }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [since]);

  if (!since || now === null) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

// A mono, uppercase, underline-style segmented control — matching the
// same terminal-panel vocabulary as SectionHead, distinct from the site's
// solid-filled pill tabs used elsewhere (a different, calmer register:
// this switches views inside one instrument, not between whole sections
// of an app).
export function HudTabs<T extends string>({ tabs, active, onChange }: { tabs: { id: T; label: string }[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="scroll-thin -mx-1 flex gap-4 overflow-x-auto border-b border-white/[0.07] px-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative shrink-0 pb-2.5 pt-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
            active === tab.id ? "text-white" : "text-white/35"
          }`}
        >
          {tab.label}
          {active === tab.id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-shu-500" />}
        </button>
      ))}
    </div>
  );
}
