"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The big pillar glyph (検/生/知/組) lights up on desktop via plain CSS
 * :hover (gated behind `@media (hover: hover)` below so a tap-triggered
 * synthetic hover on a touch device can never light it up that way — an
 * earlier version relied on `group-hover:` unguarded, and mobile browsers
 * happily fire a lingering :hover state from a plain tap, which is exactly
 * why it was "lighting up only by tap/touch" instead of by scroll).
 *
 * On touch devices it lights up instead as it crosses the vertical center
 * of the viewport, computed directly from getBoundingClientRect on scroll
 * — not IntersectionObserver's rootMargin trick, which is unreliable on
 * mobile browsers whose viewport height changes as the address bar
 * shows/hides. Touch detection uses maxTouchPoints/ontouchstart rather than
 * a `hover`/`pointer` media query, since some mobile browsers report those
 * ambiguously.
 */
export function PillarGlyph({ glyph }: { glyph: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    function check() {
      raf = 0;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      setActive(Math.abs(center - window.innerHeight / 2) < window.innerHeight * 0.32);
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(check);
    }
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <span
      ref={ref}
      className={`cursor-default font-display text-6xl font-black leading-none transition-all duration-500 sm:text-7xl [@media(hover:hover)]:group-hover:text-shu-400/90 [@media(hover:hover)]:group-hover:[text-shadow:0_0_50px_rgba(255,45,85,0.85),0_0_100px_rgba(255,45,85,0.4)] ${
        active ? "text-shu-400/90 [text-shadow:0_0_50px_rgba(255,45,85,0.85),0_0_100px_rgba(255,45,85,0.4)]" : "text-white/[0.08]"
      }`}
    >
      {glyph}
    </span>
  );
}
