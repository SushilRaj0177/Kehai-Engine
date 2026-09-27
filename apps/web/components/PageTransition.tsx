"use client";

import { usePathname } from "next/navigation";

// Every navigation swaps this wrapper's key, which remounts it and
// re-triggers the page-enter CSS animation (globals.css) -- the same
// spring-like rise .home-stagger uses, applied once per route change
// instead of once on the home dashboard's own mount. This is the one
// place that has to sit above every page (root layout), so it's the
// natural home for "a new page just arrived" motion rather than each
// page re-implementing its own entrance.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
