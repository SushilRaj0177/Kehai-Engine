"use client";

import { forwardRef } from "react";

/**
 * The big pillar glyph (検/生/知/組) lights up on desktop via plain CSS
 * :hover (gated behind `@media (hover: hover)` below so a tap-triggered
 * synthetic hover on a touch device can never light it up that way — an
 * earlier version relied on `group-hover:` unguarded, and mobile browsers
 * happily fire a lingering :hover state from a plain tap).
 *
 * On touch devices, which glyph is lit is decided by the parent (see
 * `useClosestPillar` in page.tsx) rather than each glyph independently
 * deciding it's "close enough" to center — independent per-glyph thresholds
 * meant two adjacent glyphs could both fall within range at once and light
 * up together, since the pillar rows sit closer together than twice that
 * threshold. Picking a single closest-to-center winner across the whole
 * list guarantees only one is ever active.
 */
export const PillarGlyph = forwardRef<HTMLSpanElement, { glyph: string; active: boolean }>(function PillarGlyph(
  { glyph, active },
  ref
) {
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
});
