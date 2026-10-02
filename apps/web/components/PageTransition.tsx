"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect warns during SSR on React 18; on the server this is a no-op anyway.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Every navigation swaps this wrapper's key, which remounts it and
// re-triggers the page-enter CSS animation (globals.css). This is
// deliberately a *fallback* now: browsers that support the View
// Transitions API (wired up via next-view-transitions in layout.tsx) get
// a real native cross-fade of old-page/new-page snapshots instead, which
// looks better and is what actually drives the bottom nav's active-pill
// morph. Firefox and older Safari don't support that API yet, so those
// browsers still get this plain opacity fade rather than an instant snap.
// `document.startViewTransition` isn't defined during SSR, so this checks
// safely and re-checks per render (its value never changes within a
// session, but reading it inside render -- not module scope -- keeps this
// component trivially testable/SSR-safe without a useEffect+state dance).
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // After the first in-app navigation, mark <html> so the installed app's
  // panel fade-up (pwa.css, .pwa-rise) only plays when the app opens, not
  // on every tab switch: there the page-switch animation is the motion,
  // and fading the new page's content up from invisible on top of it read
  // as a black flash. A layout effect, so the mark is set before the new
  // page's first paint.
  const firstPath = useRef(pathname);
  useIsomorphicLayoutEffect(() => {
    if (pathname !== firstPath.current) document.documentElement.dataset.navigated = "";
  }, [pathname]);
  const hasNativeViewTransitions = typeof document !== "undefined" && "startViewTransition" in document;
  return (
    <div key={pathname} className={hasNativeViewTransitions ? undefined : "page-transition"}>
      {children}
    </div>
  );
}
