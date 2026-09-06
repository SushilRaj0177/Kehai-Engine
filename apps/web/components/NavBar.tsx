"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { Button } from "./ui/Button";

export function NavBar() {
  const { user, memberships, logout } = useAuth();
  const { t, locale, toggle } = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const primaryOrg = memberships[0]?.organization;

  return (
    // Floating capsule, not a flat edge-to-edge bar: margin on every side,
    // a fully rounded shell, and a soft ambient glow standing in for what
    // was a single hard 1px border — the bar reads as an object sitting on
    // the page instead of a wall cutting across it.
    <header className="sticky top-4 z-40 px-4">
      <div
        className="mx-auto flex h-[64px] max-w-6xl items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.05] px-3 pl-6 backdrop-blur-2xl"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 12px 40px -12px rgba(0,0,0,0.6), 0 0 60px -20px rgba(255,45,85,0.18)" }}
      >
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="font-display text-2xl font-black leading-none text-shu-400 transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_22px_rgba(255,45,85,0.65)]">
            気
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            KEHAI
            <span className="mx-2 inline-block h-3 w-px bg-white/15 align-middle" />
            <span className="font-normal tracking-[0.2em] text-white/40">ENGINE</span>
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

        <div className="flex items-center gap-2">
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
      </div>
    </header>
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
      className="relative mr-1 h-9 w-[132px] shrink-0 rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:border-white/20"
    >
      {/* sliding thumb — real physical motion, not a color-swap toggle */}
      <span
        aria-hidden
        className={`absolute inset-y-[3px] left-[3px] w-16 rounded-full bg-gradient-to-br from-shu-500 to-shu-600 shadow-[0_0_12px_rgba(255,45,85,0.5)] transition-transform duration-300 ease-out ${
          isJa ? "translate-x-[62px]" : "translate-x-0"
        }`}
      />
      {/* z-10 makes sure these labels always paint above the thumb — the
          Japanese label specifically needs font-display (Noto Sans JP);
          without it, it silently falls back to a thin system CJK font
          under font-bold and reads as nearly invisible at this size.
          日本語 ("nihongo" = "the Japanese language") — not 日 alone,
          which just means "day/sun" and is ambiguous as a language label. */}
      <span className="relative z-10 flex h-full items-center justify-between px-3 text-xs font-bold tracking-wide">
        <span className={isJa ? "text-white/35" : "text-white"}>EN</span>
        <span className={`font-display text-sm ${isJa ? "text-white" : "text-white/35"}`}>日本語</span>
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
