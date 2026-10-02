"use client";

import { useSyncExternalStore } from "react";

// Whether this page is running as an installed PWA (opened from a
// home-screen icon, no browser chrome) rather than a normal mobile browser
// tab. `(display-mode: standalone)` covers Android/Chrome and modern iOS;
// `navigator.standalone` is the older iOS Safari-specific flag, still worth
// checking since not every iOS version reports display-mode correctly for
// a home-screen-added page.
//
// Returns `null` until determined (on the server and while the first page
// load hydrates -- this can only be known client-side, so the server-rendered
// HTML can't include it; pages reached by in-app navigation know it at once)
// and a boolean once resolved. Callers that render
// different UI per mode should treat `null` as "don't know yet" and show
// neither variant rather than guessing -- guessing wrong means a visible
// flash-then-swap once the real answer comes in a moment later, which is
// worse than one brief instant with a reduced UI.

function readStandalone(): boolean {
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// useSyncExternalStore: during hydration of the server HTML it returns the
// server value (null) and then re-renders, exactly as before. But a page
// mounted by a client-side navigation gets the real answer on its very
// first render, so switching pages in the installed app never renders the
// browser variant (or a blank "don't know yet" frame) first.
export function useIsStandalone(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, readStandalone, () => null);
}
