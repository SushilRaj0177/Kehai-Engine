"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";

// Temporarily off: outbound email isn't deliverable yet (no verified Resend
// sending domain configured), so nagging users to verify an address that
// can't receive mail would just be a dead end. Flip back on once a sending
// domain is verified — nothing else about email verification changed.
const EMAIL_VERIFICATION_UI_ENABLED = false;

export function NavBar() {
  const { user, memberships, logout } = useAuth();
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  // Separate from menuOpen so the panel mounts first at its closed (base
  // .mobile-menu-reveal) styles, then flips to .is-visible a frame later —
  // toggling both in the same render would apply the "open" class on the
  // very first paint and the transition would never actually run.
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      setMenuVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => setMenuVisible(true));
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  const primaryOrg = memberships[0]?.organization;

  return (
    // Floating capsule, not a flat edge-to-edge bar: margin on every side,
    // a fully rounded shell, and a soft ambient glow standing in for what
    // was a single hard 1px border — the bar reads as an object sitting on
    // the page instead of a wall cutting across it.
    <header className="sticky top-4 z-40 px-4">
      <div
        // Right padding is more generous than the left (pr-4/sm:pr-6 vs.
        // pl-4/sm:pl-6 before this) — the sign-out button's HUD corner
        // brackets float a few px outside its own box, and the plain px-2
        // this used to end on didn't leave them any room to breathe against
        // the pill's own rounded edge.
        className="mx-auto flex h-[64px] max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.05] pl-4 pr-4 backdrop-blur-2xl sm:pl-6 sm:pr-6"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 12px 40px -12px rgba(0,0,0,0.6), 0 0 60px -20px rgba(255,45,85,0.18)" }}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="font-display text-2xl font-black leading-none text-shu-400 transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_22px_rgba(255,45,85,0.65)]">
            気
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            KEHAI
            {/* Hidden below sm — on a narrow phone this pill has to also fit
                the locale toggle and CTA buttons, and "| ENGINE" was the
                first thing squeezed into overlap; the kanji + KEHAI wordmark
                alone still reads fine as the brand mark. Desktop (sm and up)
                is untouched. */}
            <span className="mx-2 hidden h-3 w-px bg-white/15 align-middle sm:inline-block" />
            <span className="hidden font-normal tracking-[0.2em] text-white/40 sm:inline">ENGINE</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/events" active={!!pathname?.startsWith("/events")}>
            {t("nav.discover")}
          </NavLink>
          {user && (
            <NavLink href="/my-events" active={pathname === "/my-events"}>
              {t("nav.myEvents")}
            </NavLink>
          )}
          <NavLink href="/classrooms" active={!!pathname?.startsWith("/classrooms")}>
            {t("nav.classrooms")}
          </NavLink>
          {user && (
            <NavLink
              href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
              active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
            >
              {t("nav.console")}
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hidden below sm, same as "Sign in" further down — with the
              logo, an unauthenticated "Get started" button (whose HUD
              corner brackets deliberately float outside its own box), and
              the hamburger all needing room in the same row, this was the
              one element still shown unconditionally on every width and
              the thing actually causing the bar to overflow/crowd on a
              real phone. Reachable instead as its own row in the mobile
              menu below. */}
          <div className="hidden sm:block">
            <LocaleSwitch locale={locale} onToggle={toggle} />
          </div>

          {user ? (
            <>
              {/* Dropped below md, not just sm — the HUD button's own
                  corner brackets already read as "this is the account
                  cluster," so the name is a nice-to-have that yields first
                  as the bar narrows, rather than fighting the brackets for
                  room down to the last few px. */}
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
              {/* Hidden below sm — logo + locale toggle + both auth buttons
                  don't fit a narrow phone width, so "Get started" (the
                  actual conversion action) stays and this secondary one
                  drops. Reachable instead through the "..." menu below. */}
              <Link href="/login" className="hidden sm:block">
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

          {/* Compact "more" menu, mobile only — Discover/My Events/Console
              are already hidden below md (no room for full nav links), and
              Sign in is hidden below sm too, so on a phone none of that was
              reachable from the navbar at all. This surfaces all of it in a
              dropdown instead of trying to cram it into the bar itself.
              Desktop (sm and up) never renders this button at all. */}
          <button
            type="button"
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 sm:hidden"
          >
            <span className="flex flex-col items-center gap-[3px]">
              <span className="h-[1.5px] w-4 rounded-full bg-current" />
              <span className="h-[1.5px] w-4 rounded-full bg-current" />
              <span className="h-[1.5px] w-4 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        // Absolutely positioned against the header (its `sticky` already
        // establishes the containing block, no extra `relative` needed) so
        // it floats over the page instead of pushing the hero content down
        // in normal flow -- was previously a plain block sibling.
        <div
          className={`mobile-menu-reveal ${menuVisible ? "is-visible" : ""} absolute inset-x-4 top-[72px] z-50 mx-auto max-w-6xl rounded-2xl border border-white/[0.08] bg-void-900/95 p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:hidden`}>
          <MobileMenuLink href="/events" active={!!pathname?.startsWith("/events")} onNavigate={() => setMenuOpen(false)}>
            {t("nav.discover")}
          </MobileMenuLink>
          {user && (
            <MobileMenuLink href="/my-events" active={pathname === "/my-events"} onNavigate={() => setMenuOpen(false)}>
              {t("nav.myEvents")}
            </MobileMenuLink>
          )}
          <MobileMenuLink href="/classrooms" active={!!pathname?.startsWith("/classrooms")} onNavigate={() => setMenuOpen(false)}>
            {t("nav.classrooms")}
          </MobileMenuLink>
          {user && (
            <MobileMenuLink
              href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
              active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
              onNavigate={() => setMenuOpen(false)}
            >
              {t("nav.console")}
            </MobileMenuLink>
          )}
          {user && <div className="my-1 h-px bg-white/[0.06]" />}
          {user && (
            <MobileMenuLink href="/settings" active={pathname === "/settings"} onNavigate={() => setMenuOpen(false)}>
              {t("nav.settings")}
            </MobileMenuLink>
          )}
          {!user && (
            <MobileMenuLink href="/login" onNavigate={() => setMenuOpen(false)}>
              {t("nav.signIn")}
            </MobileMenuLink>
          )}
          <div className="my-1 h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/35">{t("nav.toggleLanguage")}</span>
            <LocaleSwitch locale={locale} onToggle={toggle} />
          </div>
        </div>
      )}
      {EMAIL_VERIFICATION_UI_ENABLED && user && !user.emailVerifiedAt && <VerifyEmailBanner />}
    </header>
  );
}

function MobileMenuLink({
  href,
  active,
  onNavigate,
  children,
}: {
  href: string;
  active?: boolean;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
        active ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function LocaleSwitch({ locale, onToggle }: { locale: "en" | "ja"; onToggle: () => void }) {
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
      className="relative mr-1 h-8 w-20 shrink-0 rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 sm:h-9 sm:w-[132px]"
    >
      {/* sliding thumb — real physical motion, not a color-swap toggle.
          Width and position are set imperatively (see the effect above) to
          hug whichever label is active, rather than a fixed half-track
          size that fit neither label well. */}
      <span
        ref={thumbRef}
        aria-hidden
        className="absolute inset-y-[2px] left-0 rounded-full bg-gradient-to-br from-shu-500 to-shu-600 shadow-[0_0_12px_rgba(255,45,85,0.5)] transition-[transform,width] duration-300 ease-out sm:inset-y-[3px]"
      />
      {/* z-10 makes sure these labels always paint above the thumb — the
          Japanese label specifically needs font-display (Noto Sans JP);
          without it, it silently falls back to a thin system CJK font
          under font-bold and reads as nearly invisible at this size.
          日本語 ("nihongo" = "the Japanese language") — not 日 alone,
          which just means "day/sun" and is ambiguous as a language label. */}
      <span className="relative z-10 flex h-full items-center justify-between px-2.5 text-[10px] font-bold tracking-wide sm:px-4 sm:text-xs">
        <span ref={enRef} className={isJa ? "text-white/35" : "text-white"}>
          EN
        </span>
        <span ref={jaRef} className={`font-display text-[10px] sm:text-sm ${isJa ? "text-white" : "text-white/35"}`}>
          日本語
        </span>
      </span>
    </button>
  );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`group relative rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${
        active ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

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
