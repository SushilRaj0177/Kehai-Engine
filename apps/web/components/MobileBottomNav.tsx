"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";

// Primary mobile navigation now lives here instead of a top hamburger +
// dropdown -- the same shift essentially every well-known app with real
// navigational depth has made on small screens (Instagram, Spotify,
// Robinhood, Notion's mobile web app, Coinbase): a fixed bottom tab bar
// instead of a top menu, because it's reachable with a thumb without
// stretching and doesn't cost vertical space out of the page content
// itself the way a tall top bar does. NavBar's mobile header is now just
// the logo -- everything that used to live in its hamburger dropdown
// (Discover, Classrooms, Console, Settings, sign in, language) is either
// a tab here or, for language/sign-out, one tap into Account -> Settings.
// Desktop (sm and up) never renders this at all; NavBar's full top nav is
// untouched there.
export function MobileBottomNav() {
  const { t } = useLocale();
  const { user, loading } = useAuth();
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-void-900/90 backdrop-blur-2xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-stretch">
        {/* Was missing entirely -- once you navigated anywhere else there
            was no way back to /home short of relaunching the app fresh
            (the standalone-only redirect on "/" only fires on a true
            cold start, not on ordinary in-app navigation). */}
        <TabLink href="/home" active={pathname === "/home"} label={t("nav.home")} icon={<HomeIcon />} />
        <TabLink href="/events" active={!!pathname?.startsWith("/events")} label={t("nav.discover")} icon={<CompassIcon />} />
        <TabLink
          href="/classrooms"
          active={!!pathname?.startsWith("/classrooms")}
          label={t("nav.classrooms")}
          icon={<CapIcon />}
        />
        {loading ? (
          <>
            <TabSkeleton />
            <TabSkeleton />
          </>
        ) : user ? (
          <LoggedInTabs pathname={pathname} />
        ) : (
          <LoggedOutTabs />
        )}
      </div>
    </nav>
  );
}

function LoggedInTabs({ pathname }: { pathname: string | null }) {
  const { t } = useLocale();
  const { memberships } = useAuth();
  const primaryOrg = memberships[0]?.organization;
  const consoleHref = primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard";

  return (
    <>
      <TabLink
        href={consoleHref}
        active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
        label={t("nav.consoleShort")}
        icon={<GridIcon />}
      />
      <TabLink href="/settings" active={pathname === "/settings"} label={t("nav.account")} icon={<UserIcon />} />
    </>
  );
}

function LoggedOutTabs() {
  const { t } = useLocale();
  return (
    <>
      <TabLink href="/login" active={false} label={t("nav.signIn")} icon={<SignInIcon />} />
      <TabLink href="/register" active={false} label={t("nav.getStarted")} icon={<SparkIcon />} />
    </>
  );
}

function TabLink({ href, active, label, icon }: { href: string; active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide transition-colors ${
        active ? "text-shu-400" : "text-white/45 active:text-white/70"
      }`}
    >
      <span className={active ? "drop-shadow-[0_0_8px_rgba(255,45,85,0.55)]" : ""}>{icon}</span>
      <span className="uppercase">{label}</span>
    </Link>
  );
}

function TabSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5" aria-hidden>
      <span className="h-5 w-5 animate-pulse rounded-full bg-white/[0.08]" />
      <span className="h-2 w-8 animate-pulse rounded-full bg-white/[0.08]" />
    </div>
  );
}

const iconProps = {
  width: 22,
  height: 22,
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
