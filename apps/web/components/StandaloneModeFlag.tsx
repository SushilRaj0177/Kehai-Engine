"use client";

import { useEffect } from "react";
import { useIsStandalone } from "@/lib/useStandalone";

// Mirrors useIsStandalone() onto a data-attribute on <html> so plain CSS
// (globals.css's [data-standalone="true"] selectors) can scope styling to
// the installed PWA without every consumer needing to call the hook
// itself — this is what lets SURFACE/HERO_SHADOW (Hud.tsx) and PageGlow's
// deliberately PWA-only look stay out of the plain mobile-browser-tab
// experience without threading isStandalone through ~20 page files.
// Renders nothing; RootLayout mounts this once.
export function StandaloneModeFlag() {
  const isStandalone = useIsStandalone();

  useEffect(() => {
    // Leaving the attribute unset while isStandalone is still null (the
    // instant right after first paint, before the media query resolves)
    // means CSS defaults to the browser-tab look until proven otherwise —
    // the safer default, since it's what the vast majority of visits are.
    if (isStandalone === null) return;
    document.documentElement.dataset.standalone = isStandalone ? "true" : "false";
  }, [isStandalone]);

  return null;
}
