"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The big pillar glyph (検/生/知/組) lights up on desktop via plain CSS
 * :hover (group-hover, set by the caller). Touch devices have no hover, so
 * on mobile it never lit up at all — this adds a scroll-driven equivalent
 * that activates the glyph as it passes near the vertical center of the
 * viewport, but only wires itself up on devices with no real hover (the
 * `hover: none` check), so desktop's existing hover behavior is completely
 * untouched — `active` simply never becomes true there.
 */
export function PillarGlyph({ glyph }: { glyph: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), {
      rootMargin: "-42% 0px -42% 0px",
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      className={`cursor-default font-display text-6xl font-black leading-none transition-all duration-500 group-hover:text-shu-400/90 group-hover:[text-shadow:0_0_50px_rgba(255,45,85,0.85),0_0_100px_rgba(255,45,85,0.4)] sm:text-7xl ${
        active ? "text-shu-400/90 [text-shadow:0_0_50px_rgba(255,45,85,0.85),0_0_100px_rgba(255,45,85,0.4)]" : "text-white/[0.08]"
      }`}
    >
      {glyph}
    </span>
  );
}
