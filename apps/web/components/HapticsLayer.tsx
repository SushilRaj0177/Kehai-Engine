"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

// Everything a finger can press gets a light tap. One delegated listener for
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

export function HapticsLayer() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Fingers only: a mouse or pen never buzzes.
      if (e.pointerType !== "touch") return;
      const el = (e.target as Element | null)?.closest(PRESSABLE);
      if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
      haptic("tap");
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
