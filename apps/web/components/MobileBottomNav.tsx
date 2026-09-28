"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/i18n";
import { useIsStandalone } from "@/lib/useStandalone";
import { Icon } from "@/components/pwa/shared";
import { PwaNotifier } from "@/components/pwa/notifications";

// The installed PWA's dock, exactly as the approved mockup draws it: a slim
// glass strip with Home / Discover / Classrooms / Account, a glowing chip
// over whichever is active, and a raised centre button for the app's most
// frequent action -- scanning a check-in QR. Renders nothing outside the
// installed app (the browser keeps its own NavBar), and nothing on the
// full-screen flows that the mockup draws without a dock.
export function MobileBottomNav() {
  const { t } = useLocale();
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? "";
  const isStandalone = useIsStandalone();

  if (isStandalone !== true) return null;
  if (/^\/classrooms\/[^/]+\/live/.test(pathname) || pathname.startsWith("/scan")) return null;

  const signedIn = !loading && !!user;
  const items = [
    { key: "home", href: "/home", label: t("nav.home"), icon: Icon.home, active: pathname === "/home" },
    { key: "discover", href: "/events", label: t("nav.discover"), icon: Icon.compass, active: pathname.startsWith("/events") },
    { key: "classrooms", href: "/classrooms", label: t("nav.classrooms"), icon: Icon.cap, active: pathname.startsWith("/classrooms") },
    {
      key: "account",
      href: signedIn ? "/settings" : "/login",
      label: signedIn ? t("nav.account") : t("nav.signIn"),
      icon: Icon.user,
      active: pathname === "/settings" || pathname === "/login" || pathname === "/register",
    },
  ];

  const tab = (item: (typeof items)[number]) => (
    <Link
      key={item.key}
      href={item.href}
      aria-label={item.label}
      aria-current={item.active ? "page" : undefined}
      className={`pwa-dock-item ${item.active ? "pwa-active" : ""}`}
    >
      {item.active && <span className="pwa-dock-chip" aria-hidden />}
      {item.icon}
    </Link>
  );

  return (
    <div className="pwa-dock-wrap">
      <PwaNotifier />
      <nav className="pwa-dock" aria-label="Primary">
        {tab(items[0])}
        {tab(items[1])}
        <div className="pwa-fab-slot">
          <Link className="pwa-fab" href={signedIn ? "/scan" : "/login"} aria-label={t("pwa.scanToCheckIn")}>
            {Icon.scan}
          </Link>
        </div>
        {tab(items[2])}
        {tab(items[3])}
      </nav>
    </div>
  );
}
