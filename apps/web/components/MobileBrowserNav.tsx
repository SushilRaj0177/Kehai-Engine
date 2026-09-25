"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { LocaleSwitch } from "./NavBar";

// The hamburger + dropdown mobile nav, restored as its own component for
// plain mobile-browser-tab visits (see MobileBottomNav for the installed-
// PWA counterpart -- NavBar picks between the two via useIsStandalone).
// Identical to the version this replaced a moment ago: same reveal
// animation, same outside-tap-to-close, same destinations.
export function MobileBrowserNav() {
  const { user, memberships, loading: authLoading } = useAuth();
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
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

  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Tapping/clicking anywhere outside the open dropdown closes it -- not
  // just the toggle button itself. `pointerdown`, not `click`: it fires
  // before the panel's own onClick/Link navigation would, so a tap on a
  // menu item both closes the menu (here) and navigates (its own
  // onNavigate) rather than needing the two to coordinate.
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuPanelRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  const primaryOrg = memberships[0]?.organization;

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={t("nav.menu")}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 sm:hidden"
      >
        <span className="flex flex-col items-center gap-[3px]">
          <span className="h-[1.5px] w-4 rounded-full bg-current" />
          <span className="h-[1.5px] w-4 rounded-full bg-current" />
          <span className="h-[1.5px] w-4 rounded-full bg-current" />
        </span>
      </button>

      {menuOpen && (
        // Absolutely positioned against the header (its `sticky` already
        // establishes the containing block) so it floats over the page
        // instead of pushing content down in normal flow.
        <div
          ref={menuPanelRef}
          className={`mobile-menu-reveal ${menuVisible ? "is-visible" : ""} absolute inset-x-4 top-[72px] z-50 mx-auto max-w-6xl rounded-2xl border border-white/[0.08] bg-void-900/95 p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:hidden`}
        >
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
          {!authLoading && !user && (
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
    </>
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
