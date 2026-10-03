"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

// Everything a finger taps gets a light buzz. One delegated listener for
// the whole app (mounted once in layout.tsx), so new buttons get it for free.
const PRESSABLE = [
  "button",
  "a[href]",
  "summary",
  "label",
  '[role="button"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  ".tap-row",
].join(",");

/** A finger that moves this far before lifting is scrolling, not tapping. */
const TAP_SLOP_PX = 10;

// A finger landing on a button may be starting a scroll, so the buzz waits
// for a real tap, like a native button: the finger has to lift on the same
// element without moving past the slop, and the touch is dropped the moment
// the browser takes it over for scrolling (pointercancel).
export function HapticsLayer() {
  useEffect(() => {
    let touch: { id: number; el: Element; x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      // Fingers only: a mouse or pen never buzzes.
      if (e.pointerType !== "touch") return;
      const el = (e.target as Element | null)?.closest(PRESSABLE);
      touch = el && !el.matches(':disabled, [aria-disabled="true"]') ? { id: e.pointerId, el, x: e.clientX, y: e.clientY } : null;
    };
    const onMove = (e: PointerEvent) => {
      if (touch && e.pointerId === touch.id && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > TAP_SLOP_PX) touch = null;
    };
    const onUp = (e: PointerEvent) => {
      const t = touch;
      if (!t || e.pointerId !== t.id) return;
      touch = null;
      const over = document.elementFromPoint(e.clientX, e.clientY);
      if (over && t.el.contains(over) && Math.hypot(e.clientX - t.x, e.clientY - t.y) <= TAP_SLOP_PX) haptic("tap");
    };
    const onCancel = (e: PointerEvent) => {
      if (touch && e.pointerId === touch.id) touch = null; // the browser took it for a scroll
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointercancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
    };
  }, []);
  return null;
}
