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
    <header className="sticky top-0 z-40 border-b border-white/8 bg-void-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-shu-500/50 bg-shu-500/10 font-display text-base font-black text-shu-400">
            気
          </span>
          <span className="font-display text-[15px] font-bold tracking-wide text-white">
            KEHAI <span className="text-white/40 font-normal">ENGINE</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/events" active={pathname?.startsWith("/events")}>
            Discover
          </NavLink>
          {user && (
            <NavLink href={primaryOrg ? `/orgs/${primaryOrg.slug}` : "/dashboard"} active={pathname?.startsWith("/orgs") || pathname === "/dashboard"}>
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
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {children}
    </Link>
  );
}
