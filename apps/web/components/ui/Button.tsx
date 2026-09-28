"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useIsStandalone } from "@/lib/useStandalone";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "cyan" | "terminal";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const ghostSizes: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-3.5 py-2 gap-2",
  lg: "text-base px-5 py-2.5 gap-2.5",
};

// A HUD targeting-reticle, not a card: four free-floating corner brackets
// framing a mostly-transparent, square-edged box, closing in flush against
// it on hover while a scanline sweeps through and the fill washes in. Reads
// as "terminal/interface" rather than "printed card" — genuinely different
// construction from the old cut-corner shape (no clip-path, no stacked
// layers standing in for a border), not just a recolor of it.
type Tone = { text: string; textHover: string; accent: string; fillHover: string; glow: string };

const tones: Record<Exclude<Variant, "ghost" | "terminal">, Tone> = {
  primary: {
    text: "text-shu-300",
    textHover: "hover:text-void-950 focus-visible:text-void-950",
    accent: "border-shu-500",
    fillHover: "bg-shu-500/90",
    glow: "shadow-[0_0_18px_-4px_rgba(255,45,85,0.55)]",
  },
  cyan: {
    text: "text-kehai-300",
    textHover: "hover:text-void-950 focus-visible:text-void-950",
    accent: "border-kehai-500",
    fillHover: "bg-kehai-500/90",
    glow: "shadow-[0_0_18px_-4px_rgba(34,226,245,0.55)]",
  },
  secondary: {
    text: "text-white/80",
    textHover: "hover:text-white focus-visible:text-white",
    accent: "border-white/25",
    fillHover: "bg-white/10",
    glow: "",
  },
  danger: {
    text: "text-red-300",
    textHover: "hover:text-white focus-visible:text-white",
    accent: "border-red-500",
    fillHover: "bg-red-500/80",
    glow: "shadow-[0_0_18px_-4px_rgba(239,68,68,0.5)]",
  },
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3.5 py-1.5 gap-1.5",
  md: "text-sm px-5 py-2.5 gap-2",
  lg: "text-base px-7 py-3.5 gap-2.5",
};

const bracketSize: Record<Size, string> = { sm: "h-2 w-2", md: "h-2.5 w-2.5", lg: "h-3 w-3" };
// Each corner mark sits this far outside the box by default (offset·0),
// then snaps flush (offset·1, i.e. translated back onto the corner) on
// hover/focus — the "power-up" cue standing in for the old fill-sweep.
const bracketPos: Record<Size, { tl: string; tr: string; bl: string; br: string }> = {
  sm: { tl: "-left-1.5 -top-1.5", tr: "-right-1.5 -top-1.5", bl: "-left-1.5 -bottom-1.5", br: "-right-1.5 -bottom-1.5" },
  md: { tl: "-left-2 -top-2", tr: "-right-2 -top-2", bl: "-left-2 -bottom-2", br: "-right-2 -bottom-2" },
  lg: { tl: "-left-2.5 -top-2.5", tr: "-right-2.5 -top-2.5", bl: "-left-2.5 -bottom-2.5", br: "-right-2.5 -bottom-2.5" },
};
const bracketSnap: Record<"tl" | "tr" | "bl" | "br", string> = {
  tl: "group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-focus-visible:translate-x-1.5 group-focus-visible:translate-y-1.5",
  tr: "group-hover:-translate-x-1.5 group-hover:translate-y-1.5 group-focus-visible:-translate-x-1.5 group-focus-visible:translate-y-1.5",
  bl: "group-hover:translate-x-1.5 group-hover:-translate-y-1.5 group-focus-visible:translate-x-1.5 group-focus-visible:-translate-y-1.5",
  br: "group-hover:-translate-x-1.5 group-hover:-translate-y-1.5 group-focus-visible:-translate-x-1.5 group-focus-visible:-translate-y-1.5",
};
const bracketEdge: Record<"tl" | "tr" | "bl" | "br", string> = {
  tl: "border-l-2 border-t-2",
  tr: "border-r-2 border-t-2",
  bl: "border-l-2 border-b-2",
  br: "border-r-2 border-b-2",
};

// One L-shaped mark per corner (a 2px border on the two facing sides),
// sitting just outside the box by default and snapping flush against it
// on hover/focus.
function Corner({ position, size, className }: { position: "tl" | "tr" | "bl" | "br"; size: Size; className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute z-10 transition-transform duration-200 ease-out",
        bracketSize[size],
        bracketPos[size][position],
        bracketEdge[position],
        bracketSnap[position],
        className
      )}
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, style, ...props },
  ref
) {
  // Installed PWA: the rebuilt screens' button language (app/pwa.css)
  // instead of the browser's HUD brackets / terminal prompt.
  const standalone = useIsStandalone();
  if (standalone === true && variant !== "ghost") {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={style}
        className={cn("pwa-btn-x", `pwa-v-${variant}`, `pwa-s-${size}`, className)}
        {...props}
      >
        {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    );
  }

  // Reached for on nearly every minor, frequent action (Cancel, a dropdown
  // item, a small table action) — it skips the HUD apparatus entirely so
  // it doesn't compete with the buttons meant to stand out.
  if (variant === "ghost") {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={style}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium text-white/70",
          "transition-[background-color,color,transform] duration-150 hover:bg-white/[0.06] hover:text-white active:scale-[0.96]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60",
          ghostSizes[size],
          className
        )}
        {...props}
      >
        {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    );
  }

  // Browser CTA style: a pill with a shu-to-kehai gradient hairline, the
  // label in the display face, and a solid shu arrow disc that slides
  // forward on hover. Used wherever "terminal" is asked for (hero CTAs,
  // empty-state actions, form submits) so every primary call-to-action in
  // the browser reads the same way.
  if (variant === "terminal" || variant === "primary") {
    const pad = size === "sm" ? "pl-4 pr-1 py-1 gap-2.5 text-[13px]" : size === "lg" ? "pl-6 pr-1.5 py-1.5 gap-4 text-base" : "pl-5 pr-1.5 py-1.5 gap-3 text-sm";
    const disc = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-8 w-8";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={style}
        className={cn(
          "group relative inline-flex rounded-full bg-gradient-to-r from-shu-500/80 via-white/15 to-kehai-400/70 p-px",
          "shadow-[0_10px_30px_-14px_rgba(255,45,85,0.55)] transition-[transform,box-shadow] duration-300 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-14px_rgba(255,45,85,0.75)] active:translate-y-0 active:scale-[0.98]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "flex w-full items-center justify-between rounded-full bg-void-950/95 font-display font-semibold tracking-wide text-white/90 transition-colors duration-300 group-hover:bg-void-900/90 group-hover:text-white",
            pad
          )}
        >
          <span className="flex-1 text-center">{children}</span>
          <span
            aria-hidden
            className={cn(
              "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-shu-400 to-shu-600 text-white shadow-[0_0_14px_rgba(255,45,85,0.55)] transition-transform duration-300 ease-out group-hover:translate-x-0.5",
              disc
            )}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </span>
        </span>
      </button>
    );
  }

  const tone = tones[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={style}
      className={cn(
        "group relative isolate inline-flex items-center justify-center font-mono font-semibold uppercase tracking-[0.12em]",
        "border bg-void-950/40 backdrop-blur-sm transition-[transform,background-color,box-shadow] duration-200",
        "active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-void-950 focus-visible:ring-shu-400/60",
        "hover:shadow-none",
        tone.text,
        tone.textHover,
        tone.accent,
        tone.glow,
        sizes[size],
        className
      )}
      {...props}
    >
      {/* Scanline sweep, clipped to the box — a thin bright line racing
          left-to-right once on hover, standing in for the old fill-sweep. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <span className="absolute inset-y-0 left-[-30%] w-[30%] -skew-x-12 bg-white/25 transition-transform duration-500 ease-out translate-x-[-10%] group-hover:translate-x-[430%]" />
      </span>
      {/* Fill wash, underneath the label, growing in on hover */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 z-0 origin-center scale-0 transition-transform duration-200 ease-out group-hover:scale-100 group-focus-visible:scale-100",
          tone.fillHover
        )}
      />
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <Corner key={pos} position={pos} size={size} className={tone.accent} />
      ))}
      {loading ? (
        <span className="relative z-10 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
});
