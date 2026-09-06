"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { Button } from "./ui/Button";

export function NavBar() {
  const { user, memberships, logout } = useAuth();
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryOrg = memberships[0]?.organization;

  return (
    // Floating capsule, not a flat edge-to-edge bar: margin on every side,
    // a fully rounded shell, and a soft ambient glow standing in for what
    // was a single hard 1px border — the bar reads as an object sitting on
    // the page instead of a wall cutting across it.
    <header className="sticky top-4 z-40 px-4">
      <div
        className="mx-auto flex h-[64px] max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.05] px-2 pl-4 backdrop-blur-2xl sm:px-3 sm:pl-6"
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
          {user && (
            <NavLink
              href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
              active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
            >
              {t("nav.console")}
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitch locale={locale} onToggle={toggle} />

          {user ? (
            <>
              <span className="hidden text-sm text-white/50 sm:inline">{user.name}</span>
              <Button
                variant="ghost"
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
            aria-label="Menu"
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
        <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-white/[0.08] bg-void-950/95 p-2 backdrop-blur-2xl sm:hidden">
          <MobileMenuLink href="/events" onNavigate={() => setMenuOpen(false)}>
            {t("nav.discover")}
          </MobileMenuLink>
          {user && (
            <MobileMenuLink href="/my-events" onNavigate={() => setMenuOpen(false)}>
              {t("nav.myEvents")}
            </MobileMenuLink>
          )}
          {user && (
            <MobileMenuLink href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"} onNavigate={() => setMenuOpen(false)}>
              {t("nav.console")}
            </MobileMenuLink>
          )}
          {!user && (
            <MobileMenuLink href="/login" onNavigate={() => setMenuOpen(false)}>
              {t("nav.signIn")}
            </MobileMenuLink>
          )}
        </div>
      )}
    </header>
  );
}

function MobileMenuLink({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-xl px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </Link>
  );
}

function LocaleSwitch({ locale, onToggle }: { locale: "en" | "ja"; onToggle: () => void }) {
  const isJa = locale === "ja";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle language"
      aria-pressed={isJa}
      className="relative mr-1 h-9 w-[92px] shrink-0 rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20 sm:w-[132px]"
    >
      {/* sliding thumb — real physical motion, not a color-swap toggle.
          Narrower track+thumb on mobile (92/44px vs 132/64px desktop) so
          this fits next to the CTA buttons on a narrow phone; the travel
          distance (translate-x) is scaled to match each track's own math
          (track - thumb - 2*inset), so the thumb still lands flush against
          the right edge at either size. Desktop values unchanged. */}
      <span
        aria-hidden
        className={`absolute inset-y-[3px] left-[3px] w-11 rounded-full bg-gradient-to-br from-shu-500 to-shu-600 shadow-[0_0_12px_rgba(255,45,85,0.5)] transition-transform duration-300 ease-out sm:w-16 ${
          isJa ? "translate-x-[42px] sm:translate-x-[62px]" : "translate-x-0"
        }`}
      />
      {/* z-10 makes sure these labels always paint above the thumb — the
          Japanese label specifically needs font-display (Noto Sans JP);
          without it, it silently falls back to a thin system CJK font
          under font-bold and reads as nearly invisible at this size.
          日本語 ("nihongo" = "the Japanese language") — not 日 alone,
          which just means "day/sun" and is ambiguous as a language label. */}
      <span className="relative z-10 flex h-full items-center justify-between px-2.5 text-xs font-bold tracking-wide sm:px-3">
        <span className={isJa ? "text-white/35" : "text-white"}>EN</span>
        <span className={`font-display text-xs sm:text-sm ${isJa ? "text-white" : "text-white/35"}`}>日本語</span>
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
