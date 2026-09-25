"use client";

import { useEffect, useState } from "react";

// Whether this page is running as an installed PWA (opened from a
// home-screen icon, no browser chrome) rather than a normal mobile browser
// tab. `(display-mode: standalone)` covers Android/Chrome and modern iOS;
// `navigator.standalone` is the older iOS Safari-specific flag, still worth
// checking since not every iOS version reports display-mode correctly for
// a home-screen-added page.
//
// Returns `null` until determined (always the case for the very first
// paint -- this can only be known client-side, so the server-rendered HTML
// can't include it) and a boolean once resolved. Callers that render
// different UI per mode should treat `null` as "don't know yet" and show
// neither variant rather than guessing -- guessing wrong means a visible
// flash-then-swap once the real answer comes in a moment later, which is
// worse than one brief instant with a reduced UI.
export function useIsStandalone(): boolean | null {
  const [standalone, setStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const evaluate = () => setStandalone(mq.matches || iosStandalone);
    evaluate();
    mq.addEventListener("change", evaluate);
    return () => mq.removeEventListener("change", evaluate);
  }, []);

  return standalone;
}
