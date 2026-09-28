"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { MobileBrowserNav } from "./MobileBrowserNav";
import { useIsStandalone } from "@/lib/useStandalone";

// Temporarily off: outbound email isn't deliverable yet (no verified Resend
// sending domain configured), so nagging users to verify an address that
// can't receive mail would just be a dead end. Flip back on once a sending
// domain is verified — nothing else about email verification changed.
const EMAIL_VERIFICATION_UI_ENABLED = false;

export function NavBar() {
  const { user, memberships, logout, loading: authLoading } = useAuth();
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  // Installed PWA (opened from a home-screen icon) gets the bottom tab
  // bar; a plain mobile browser tab gets the previous hamburger dropdown
  // back — two real, different contexts with different affordances
  // (a PWA's whole point is behaving like an app; a browser tab already
  // has the browser's own chrome, back button, tabs, etc., so a bottom
  // bar competing with that is less clearly a win there). `null` while
  // still determining renders neither, briefly, rather than guessing and
  // risking a flash-then-swap once the real answer comes in.
  const isStandalone = useIsStandalone();

  const primaryOrg = memberships[0]?.organization;

  return (
    /* Floating capsule, not a flat edge-to-edge bar: margin on every
       side, a fully rounded shell, and a soft ambient glow standing in
       for what was a single hard 1px border — the bar reads as an
       object sitting on the page instead of a wall cutting across it.
       In the installed-PWA case this is hidden outright below sm, not
       just trimmed down: MobileBottomNav (rendered once from the root
       layout, not from here) already carries every destination this bar
       would, so keeping a logo-only strip around just for branding is
       real vertical space spent on nothing actionable. Browser-tab mode
       keeps it (logo + MobileBrowserNav's hamburger). Desktop is
       unaffected either way. */
    <header className={`sticky top-4 z-40 px-4 ${isStandalone === true ? "hidden sm:block" : ""}`}>
        <div
          className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.05] pl-4 pr-4 backdrop-blur-2xl sm:h-16 sm:pl-6 sm:pr-6"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 12px 40px -12px rgba(0,0,0,0.6), 0 0 60px -20px rgba(255,45,85,0.18)" }}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="font-display text-2xl font-black leading-none text-shu-400 transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_22px_rgba(255,45,85,0.65)]">
              気
            </span>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">
              KEHAI
              {/* Hidden below sm — the mobile header is logo-only. */}
              <span className="mx-2 hidden h-3 w-px bg-white/15 align-middle sm:inline-block" />
              <span className="hidden font-normal tracking-[0.2em] text-white/40 sm:inline">ENGINE</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/events" icon={NavIcons.discover} active={!!pathname?.startsWith("/events")}>
              {t("nav.discover")}
            </NavLink>
            {user && (
              <NavLink href="/my-events" icon={NavIcons.myEvents} active={pathname === "/my-events"}>
                {t("nav.myEvents")}
              </NavLink>
            )}
            <NavLink href="/classrooms" icon={NavIcons.classrooms} active={!!pathname?.startsWith("/classrooms")}>
              {t("nav.classrooms")}
            </NavLink>
            {user && (
              <NavLink
                icon={NavIcons.console}
                href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
                active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
              >
                {t("nav.console")}
              </NavLink>
            )}
          </nav>

          {/* Everything below sm:hidden — in the installed-PWA case these
              are reachable via the bottom tab bar (Discover/Classrooms/
              Console/Account) and, for language and sign-out
              specifically, one tap into Account -> Settings. In the
              browser-tab case, MobileBrowserNav's own hamburger dropdown
              (rendered just below) covers the same ground directly. */}
          <div className="hidden items-center gap-3 sm:flex">
            <LocaleSwitch locale={locale} onToggle={toggle} />

            {authLoading ? (
              // Session check in flight (GET /api/auth/me) -- a stored
              // token almost always means a real signed-in user, so
              // rendering the signed-out CTAs here would be actively
              // wrong, not just a neutral placeholder: it tells someone
              // who IS signed in that they aren't, for however long that
              // request takes (worse on a cold-started free-tier API). A
              // same-sized pulsing placeholder holds the layout with no
              // verdict either way until the real answer comes back.
              <span className="h-8 w-24 animate-pulse rounded-full bg-white/[0.06]" aria-hidden />
            ) : user ? (
              <>
                <Link
                  href="/settings"
                  className="hidden truncate text-sm text-white/50 transition-colors hover:text-white/80 md:inline md:max-w-[10rem]"
                >
                  {user.name}
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    {t("nav.getStarted")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {isStandalone === false && <MobileBrowserNav />}
        </div>
      {EMAIL_VERIFICATION_UI_ENABLED && user && !user.emailVerifiedAt && <VerifyEmailBanner />}
    </header>
  );
}

export function LocaleSwitch({ locale, onToggle }: { locale: "en" | "ja"; onToggle: () => void }) {
  const { t } = useLocale();
  const isJa = locale === "ja";
  const trackRef = useRef<HTMLButtonElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const enRef = useRef<HTMLSpanElement>(null);
  const jaRef = useRef<HTMLSpanElement>(null);

  // A fixed-width thumb spanning exactly half the track (the previous
  // approach) never actually matches either label's own width — "EN" is
  // much narrower than "日本語", so the fill either left a lot of empty
  // padding around the short label or sat too tight against the long one.
  // Measuring each label and sizing/positioning the thumb to hug whichever
  // is active keeps the sliding-thumb motion but makes the fill actually
  // enclose the text instead of just occupying a fixed half.
  //
  // useLayoutEffect, not useEffect: NavBar is instantiated fresh on every
  // page (it isn't hoisted into the root layout), so every navigation
  // mounts a brand new LocaleSwitch whose thumb starts at its unset DOM
  // default before this positions it. useEffect runs after the browser
  // has already painted that default frame, so the correct-but-later
  // position change visibly animates in via the thumb's own transition —
  // reading exactly like the toggle just switched to Japanese, even when
  // it was already Japanese and never changed. useLayoutEffect runs
  // synchronously before paint, so that wrong intermediate frame is never
  // shown at all.
  useLayoutEffect(() => {
    function place() {
      const track = trackRef.current;
      const thumb = thumbRef.current;
      const active = (isJa ? jaRef.current : enRef.current) as HTMLSpanElement | null;
      if (!track || !thumb || !active) return;
      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const padX = trackRect.height * 0.34;
      const width = activeRect.width + padX * 2;
      const left = activeRect.left - trackRect.left - padX;
      thumb.style.width = `${width}px`;
      thumb.style.transform = `translateX(${left}px)`;
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [isJa]);

  return (
    <button
      ref={trackRef}
      type="button"
      onClick={onToggle}
      aria-label={t("nav.toggleLanguage")}
      aria-pressed={isJa}
      className="relative h-9 w-[132px] shrink-0 rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20"
    >
      {/* sliding thumb — real physical motion, not a color-swap toggle.
          Width and position are set imperatively (see the effect above) to
          hug whichever label is active, rather than a fixed half-track
          size that fit neither label well. */}
      <span
        ref={thumbRef}
        aria-hidden
        className="absolute inset-y-[3px] left-0 rounded-full bg-gradient-to-br from-shu-500 to-shu-600 shadow-[0_0_12px_rgba(255,45,85,0.5)] transition-[transform,width] duration-300 ease-out"
      />
      {/* z-10 makes sure these labels always paint above the thumb — the
          Japanese label specifically needs font-display (Noto Sans JP);
          without it, it silently falls back to a thin system CJK font
          under font-bold and reads as nearly invisible at this size.
          日本語 ("nihongo" = "the Japanese language") — not 日 alone,
          which just means "day/sun" and is ambiguous as a language label. */}
      <span className="relative z-10 flex h-full items-center justify-between px-4 text-xs font-bold tracking-wide">
        <span ref={enRef} className={isJa ? "text-white/35" : "text-white"}>
          EN
        </span>
        <span ref={jaRef} className={`font-display text-sm ${isJa ? "text-white" : "text-white/35"}`}>
          日本語
        </span>
      </span>
    </button>
  );
}

// Desktop nav item: an icon chip + label inside a pill. Inactive items stay
// quiet and brighten on hover (icon tints cyan and lifts); the active one
// gets a soft raised fill, a shu-tinted icon and a glowing underline.
function NavLink({ href, active, icon, children }: { href: string; active?: boolean; icon: React.ReactNode; children: string }) {
  return (
    <Link
      href={href}
      title={children}
      aria-label={children}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-1.5 text-sm lg:pr-4 font-semibold tracking-wide transition-all duration-300 ${
        active
          ? "bg-gradient-to-b from-white/[0.10] to-white/[0.03] text-white ring-1 ring-white/10"
          : "text-white/55 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <span
        aria-hidden
        className={`grid h-7 w-7 place-items-center rounded-full transition-all duration-300 group-hover:-translate-y-px ${
          active ? "bg-shu-500/20 text-shu-300 shadow-[0_0_12px_rgba(255,45,85,0.35)]" : "bg-white/[0.05] text-white/45 group-hover:bg-kehai-500/15 group-hover:text-kehai-300"
        }`}
      >
        {icon}
      </span>
      {/* Icon-only between md and lg, where five labelled pills plus the
          language switch and account controls don't fit on one line. */}
      <span className="hidden whitespace-nowrap lg:inline">{children}</span>
      {active && (
        <span aria-hidden className="absolute -bottom-[3px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-shu-500 shadow-[0_0_8px_rgba(255,45,85,0.8)]" />
      )}
    </Link>
  );
}

const navIconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const NavIcons = {
  discover: (
    <svg {...navIconProps}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="15,9 13,13 9,15 11,11" fill="currentColor" stroke="none" />
    </svg>
  ),
  myEvents: (
    <svg {...navIconProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  ),
  classrooms: (
    <svg {...navIconProps}>
      <path d="M12 4.5l9 4.5-9 4.5-9-4.5z" />
      <path d="M6.5 11v4.5c0 1.2 2.5 3 5.5 3s5.5-1.8 5.5-3V11" />
    </svg>
  ),
  console: (
    <svg {...navIconProps}>
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </svg>
  ),
};

function VerifyEmailBanner() {
  const { t } = useLocale();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setError(null);
    setSending(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("verifyEmail.resendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto mt-2 flex max-w-6xl flex-wrap items-center justify-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
      <span>{sent ? t("verifyEmail.bannerSent") : t("verifyEmail.bannerMessage")}</span>
      {!sent && (
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="font-semibold text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-200 disabled:opacity-50"
        >
          {sending ? t("verifyEmail.resending") : t("verifyEmail.resendLink")}
        </button>
      )}
      {error && <span className="text-shu-300">{error}</span>}
    </div>
  );
}
