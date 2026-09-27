"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { useIsStandalone } from "@/lib/useStandalone";

// Primary mobile navigation now lives here instead of a top hamburger +
// dropdown -- the same shift essentially every well-known app with real
// navigational depth has made on small screens (Instagram, Spotify,
// Robinhood, Notion's mobile web app, Coinbase): a fixed bottom tab bar
// instead of a top menu, because it's reachable with a thumb without
// stretching and doesn't cost vertical space out of the page content
// itself the way a tall top bar does.
//
// Rendered once from the root layout (not per-page from NavBar, where it
// used to live) so it's a single persistent instance across every
// client-side navigation instead of remounting fresh on each one --
// NavBar's own LocaleSwitch has a comment documenting exactly this same
// remount problem for a different component. A View Transitions-based
// indicator (the previous approach here) was fighting that remount the
// whole time: the browser's cross-page snapshot machinery and this
// component's own lifecycle were never fully in sync, which is what read
// as janky. Continuity fixes that at the root -- the active-tab indicator
// below is a single DOM node whose position is measured and animated with
// a real CSS transition, the same technique already proven in this file's
// sibling NavBar.tsx for its language-switch thumb, rather than reasoning
// about the browser's separate view-transition timeline.
export function MobileBottomNav() {
  const { t } = useLocale();
  const { user, memberships, loading } = useAuth();
  const pathname = usePathname();
  const isStandalone = useIsStandalone();

  const primaryOrg = memberships[0]?.organization;
  const consoleHref = primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard";

  // Rendering neither variant until standalone-ness is known avoids a
  // flash-then-swap once the real answer arrives (same reasoning as
  // NavBar's own isStandalone check) -- and this used to only mount at
  // all when NavBar had already confirmed `true`, so a plain `false`/`null`
  // bail-out here reproduces that exactly now that it's hoisted above NavBar.
  if (isStandalone !== true) return null;

  const tabs: { key: string; href: string; label: string; icon: React.ReactNode; active: boolean }[] = loading
    ? []
    : user
      ? [
          { key: "home", href: "/home", label: t("nav.home"), icon: <HomeIcon />, active: pathname === "/home" },
          { key: "discover", href: "/events", label: t("nav.discover"), icon: <CompassIcon />, active: !!pathname?.startsWith("/events") },
          { key: "classrooms", href: "/classrooms", label: t("nav.classrooms"), icon: <CapIcon />, active: !!pathname?.startsWith("/classrooms") },
          {
            key: "console",
            href: consoleHref,
            label: t("nav.consoleShort"),
            icon: <GridIcon />,
            active: !!pathname?.startsWith("/orgs") || pathname === "/dashboard",
          },
          { key: "account", href: "/settings", label: t("nav.account"), icon: <UserIcon />, active: pathname === "/settings" },
        ]
      : [
          { key: "home", href: "/home", label: t("nav.home"), icon: <HomeIcon />, active: pathname === "/home" },
          { key: "discover", href: "/events", label: t("nav.discover"), icon: <CompassIcon />, active: !!pathname?.startsWith("/events") },
          { key: "classrooms", href: "/classrooms", label: t("nav.classrooms"), icon: <CapIcon />, active: !!pathname?.startsWith("/classrooms") },
          { key: "signin", href: "/login", label: t("nav.signIn"), icon: <SignInIcon />, active: false },
          { key: "register", href: "/register", label: t("nav.getStarted"), icon: <SparkIcon />, active: false },
        ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 sm:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      {/* A floating pill, not an edge-to-edge bar: inset from the screen
          edges on all sides so it reads as one instrument resting on top
          of the page rather than a strip of chrome bolted to its border. */}
      <div
        className="flex h-[60px] w-full max-w-[300px] items-stretch gap-0.5 rounded-full border border-white/[0.10] bg-void-800/85 px-1.5 backdrop-blur-2xl"
        style={{ boxShadow: "0 20px 44px -18px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.07)" }}
      >
        {loading ? (
          <>
            <TabSkeleton />
            <TabSkeleton />
            <TabSkeleton />
          </>
        ) : (
          <TabRow tabs={tabs} />
        )}
      </div>
    </nav>
  );
}

function TabRow({ tabs }: { tabs: { key: string; href: string; label: string; icon: React.ReactNode; active: boolean }[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const bounceRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const activeKey = tabs.find((tab) => tab.active)?.key ?? null;

  // useLayoutEffect (not useEffect), same reasoning as LocaleSwitch's
  // thumb: this measures and positions synchronously before the browser
  // paints, so a route change never shows one wrong frame of the
  // indicator sitting at its previous tab before snapping to the right
  // one -- it's just never painted in the wrong place at all.
  useLayoutEffect(() => {
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    const bounce = bounceRef.current;
    const activeEl = activeKey ? tabRefs.current.get(activeKey) : null;
    if (!track || !indicator) return;

    if (!activeEl) {
      indicator.style.opacity = "0";
      return;
    }

    // activeEl is the flex-1 wrapper div (full tab-column width, not the
    // 44px icon circle inside it) -- registerRef has to target that
    // wrapper rather than the circle because next-view-transitions' Link
    // doesn't forward refs (see TabLink), so the indicator is sized to a
    // fixed 44px circle and centered on the wrapper's midpoint instead of
    // matched to its measured width.
    const SIZE = 44;
    const trackRect = track.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const centerX = activeRect.left - trackRect.left + activeRect.width / 2;
    const centerY = activeRect.top - trackRect.top + activeRect.height / 2;
    indicator.style.opacity = "1";
    indicator.style.width = `${SIZE}px`;
    indicator.style.height = `${SIZE}px`;
    // This is the ONLY thing that sets `transform` on this element --
    // the landing bounce lives on a separate inner child (bounceRef)
    // instead of also animating `transform` here, because a CSS
    // animation's keyframe values fully replace the animated property
    // for its duration: a scale() keyframe on this same node would blow
    // away this translate() every time it played, snapping the pill to
    // the track's top-left corner mid-bounce.
    indicator.style.transform = `translate(${centerX - SIZE / 2}px, ${centerY - SIZE / 2}px)`;

    // Restart the landing-bounce keyframe on every tab change -- a CSS
    // animation on an element that never unmounts only plays once ever
    // unless explicitly restarted. The classic, reliable way to do that:
    // remove the class, force a synchronous style recalculation by
    // reading a layout property (offsetWidth -- the read itself is what
    // forces it; the value isn't otherwise used), then re-add the class.
    if (bounce) {
      bounce.classList.remove("nav-pill-pop-play");
      void bounce.offsetWidth;
      bounce.classList.add("nav-pill-pop-play");
    }
  }, [activeKey]);

  return (
    <div ref={trackRef} className="relative flex flex-1 items-stretch gap-0.5">
      <span
        ref={indicatorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 opacity-0 transition-[transform,width,height] duration-500"
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <span
          ref={bounceRef}
          className="block h-full w-full rounded-full bg-shu-500/15 drop-shadow-[0_0_8px_rgba(255,45,85,0.45)]"
        />
      </span>
      {tabs.map((tab) => (
        <TabLink
          key={tab.key}
          href={tab.href}
          active={tab.active}
          label={tab.label}
          icon={tab.icon}
          registerRef={(el) => {
            if (el) tabRefs.current.set(tab.key, el);
            else tabRefs.current.delete(tab.key);
          }}
        />
      ))}
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
  icon,
  registerRef,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  // A tiny local burst list, not the app-wide ClickRippleLayer -- that one
  // renders inside each page's own scrollable root at a lower z-index than
  // this `fixed` nav's opaque background, so it's never actually visible
  // on a nav tap no matter how it's positioned. This stays self-contained
  // to the ~44px tap target and above everything else in the nav's own
  // stacking context.
  const [blooms, setBlooms] = useState<number[]>([]);
  const nextBloomId = useRef(0);

  function spawnBloom() {
    const id = nextBloomId.current++;
    setBlooms((prev) => [...prev, id]);
    window.setTimeout(() => {
      setBlooms((prev) => prev.filter((b) => b !== id));
    }, 650);
  }

  return (
    // The measurement target for the sliding indicator (see TabRow) is
    // this wrapping div, not the <Link> itself -- next-view-transitions'
    // Link is a plain function component, not wrapped in forwardRef, so a
    // ref passed straight to it silently never reaches the underlying
    // anchor. A div wrapper sized identically to its Link child sidesteps
    // that rather than fighting it.
    <div ref={registerRef} className="relative z-10 flex flex-1">
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onPointerDown={spawnBloom}
        // active: here is Tailwind's :active pseudo-class (the CSS state
        // while pressed), unrelated to the `active` prop (whether this is
        // the current route) despite the name collision. The press itself
        // is a light, asymmetric squash (flatter on Y than X) rather than a
        // uniform shrink -- reads as a soft, compressible pill instead of
        // the whole tap target just shrinking in place. It used to spring
        // back past 1.0 on release (an overshoot easing) -- that's the
        // "thump": settling to a pure deceleration curve with no bounce
        // past rest, and a shallower squash, reads as a gentle press
        // instead of a jab.
        className={`flex flex-1 items-center justify-center transition-colors duration-200 active:scale-x-[0.94] active:scale-y-[0.9] ${
          active ? "text-shu-300" : "text-white/45 active:text-white/70"
        }`}
        style={{ transitionProperty: "color, transform", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {blooms.map((id) => (
          <span key={id} aria-hidden className="nav-tap-bloom pointer-events-none absolute left-1/2 top-1/2 h-11 w-11 rounded-full bg-white/25" />
        ))}
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full">{icon}</span>
      </Link>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center" aria-hidden>
      <span className="h-11 w-11 animate-pulse rounded-full bg-white/[0.08]" />
    </div>
  );
}

const iconProps = {
  width: 21,
  height: 21,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 11.5L12 4l8 7.5" />
      <path d="M6 10v8.5a1 1 0 001 1h3.5v-5h3v5H17a1 1 0 001-1V10" />
    </svg>
  );
}

function CompassIcon() {
  // A proper symmetric compass needle (two points reflected through the
  // circle's center: 15,9 <-> 9,15 and 13,13 <-> 11,11), not the
  // hand-approximated quadrilateral this used before, whose points didn't
  // actually mirror each other and rendered as a visibly lopsided blob.
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="15,9 13,13 9,15 11,11" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 4.5l9 4.5-9 4.5-9-4.5z" />
      <path d="M6.5 11v4.5c0 1.2 2.5 3 5.5 3s5.5-1.8 5.5-3V11" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  );
}

function SignInIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 4h7a1.5 1.5 0 011.5 1.5v13A1.5 1.5 0 0117 20h-7" />
      <path d="M14 12H3.5" />
      <path d="M7 8l-3.5 4L7 16" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5l1.8 5.1 5.2 1.8-5.2 1.8-1.8 5.2-1.8-5.2-5.2-1.8 5.2-1.8z" />
    </svg>
  );
}
