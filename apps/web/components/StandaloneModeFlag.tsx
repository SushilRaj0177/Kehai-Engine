"use client";

import { useEffect } from "react";
import { useIsStandalone } from "@/lib/useStandalone";

// Mirrors useIsStandalone() onto a data-attribute on <html> so plain CSS
// ([data-standalone="true"] selectors in globals.css) can scope styling
// to the installed PWA without threading isStandalone through every page
// that uses the shared Hud.tsx vocabulary (SURFACE, HERO_SHADOW, the
// ambient PageGlow) -- those render from the same files in a plain
// mobile-browser tab, so the split has to happen in CSS, not JSX.
// Renders nothing; RootLayout mounts this once.
export function StandaloneModeFlag() {
  const isStandalone = useIsStandalone();

  useEffect(() => {
    // Leaving the attribute unset while isStandalone is still null (the
    // instant right after first paint, before the media query resolves)
    // means CSS defaults to the browser-tab look until proven otherwise --
    // the safer default, since it's what the vast majority of visits are.
    if (isStandalone === null) return;
    document.documentElement.dataset.standalone = isStandalone ? "true" : "false";
  }, [isStandalone]);

  return null;
}
