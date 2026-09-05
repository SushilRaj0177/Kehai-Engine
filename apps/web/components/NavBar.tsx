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
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-void-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
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
            <NavLink
              href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
              active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
            >
              {t("nav.console")}
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle language"
            className="mr-1 flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs font-semibold tracking-wide text-white/40 transition-colors hover:border-white/20"
          >
            <span className={`rounded-full px-2.5 py-1 transition-colors ${locale === "en" ? "bg-white/10 text-white" : ""}`}>
              EN
            </span>
            <span className={`rounded-full px-2.5 py-1 transition-colors ${locale === "ja" ? "bg-white/10 text-white" : ""}`}>
              日本語
            </span>
          </button>

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
                Sign out
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

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`group relative px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-white/50 hover:text-white/85"
      }`}
    >
      {children}
      <span
        className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-shu-400 to-kehai-400 transition-transform duration-300 group-hover:scale-x-100 ${
          active ? "scale-x-100" : ""
        }`}
      />
    </Link>
  );
}
