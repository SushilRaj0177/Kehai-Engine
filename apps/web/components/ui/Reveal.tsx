"use client";

import { useEffect, useRef, useState } from "react";

/** Fades/slides content in once it scrolls into view. Renders visible immediately if JS hasn't run yet (no FOUC of hidden content). */
export function Reveal({
  children,
  delayMs = 0,
  className = "",
  variant = "fade",
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
  /** "curtain" is a deliberately more dramatic clip-path/scale/blur entrance
   * — reserve it for one boundary that should feel distinct (e.g. hero ->
   * next section), not for routine in-page reveals. */
  variant?: "fade" | "curtain";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setVisible(true), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  const base = variant === "curtain" ? "reveal-curtain" : "reveal";
  return (
    // The observed element itself must stay geometrically "normal" (no
    // clip-path/transform hiding it) — Chromium's IntersectionObserver
    // treats a self-clipped-to-zero-area element as permanently
    // non-intersecting, which deadlocks a curtain wipe that starts at zero
    // area (it can only reveal once observed, but is never observed while
    // clipped to nothing). So the ref + observer live on a plain wrapper,
    // and the actual hide/reveal styling goes on an inner child instead.
    <div ref={ref} className={className}>
      <div className={`${base} ${visible ? "is-visible" : ""}`}>{children}</div>
    </div>
  );
}
