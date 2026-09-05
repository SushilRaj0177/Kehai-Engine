"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/Button";

export function NavBar() {
  const { user, memberships, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const primaryOrg = memberships[0]?.organization;

  return (
    <header className="sticky top-0 z-40">
      {/* brand accent bar — static, not another animated divider */}
      <div className="h-[2px] w-full bg-gradient-to-r from-shu-500 via-kehai-500 to-shu-500 opacity-70" />

      <div className="border-b border-white/[0.07] bg-void-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span
              className="relative flex h-11 w-11 items-center justify-center bg-gradient-to-br from-shu-500/25 via-shu-500/10 to-transparent font-display text-xl font-black text-shu-400 shadow-[0_0_24px_rgba(255,45,85,0.18)] transition-shadow duration-300 group-hover:shadow-[0_0_32px_rgba(255,45,85,0.35)]"
              style={{ clipPath: "polygon(22% 0%, 100% 0%, 100% 78%, 78% 100%, 0% 100%, 0% 22%)" }}
            >
              <span className="absolute inset-0 border border-shu-500/40" style={{ clipPath: "inherit" }} />
              気
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              KEHAI
              <span className="mx-2 inline-block h-3.5 w-px bg-white/15 align-middle" />
              <span className="font-normal tracking-[0.18em] text-white/40">ENGINE</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/events" active={!!pathname?.startsWith("/events")}>
              Discover
            </NavLink>
            {user && (
              <NavLink
                href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"}
                active={!!pathname?.startsWith("/orgs") || pathname === "/dashboard"}
              >
                Organizer Console
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
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
                    Sign in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
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
