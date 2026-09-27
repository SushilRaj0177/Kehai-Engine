"use client";

import { usePathname } from "next/navigation";

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
  const hasNativeViewTransitions = typeof document !== "undefined" && "startViewTransition" in document;
  return (
    <div key={pathname} className={hasNativeViewTransitions ? undefined : "page-transition"}>
      {children}
    </div>
  );
}
