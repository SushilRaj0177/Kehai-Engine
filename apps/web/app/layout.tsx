import type { Metadata } from "next";
import { Noto_Sans_JP, Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/i18n";
import { ApiBaseSetter } from "@/components/ApiBaseSetter";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { PageTransition } from "@/components/PageTransition";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { StandaloneModeFlag } from "@/components/StandaloneModeFlag";
import { KatakanaRain } from "@/components/ui/KatakanaRain";

// Space Grotesk carries the brand's actual display voice now — Noto Sans
// JP's Latin glyphs are what made every heading read as generic/templated
// at large sizes (a safe humanist face, not a distinctive one). Noto Sans
// JP stays loaded and still renders every kanji/katakana glyph via normal
// per-character font fallback (Space Grotesk has no CJK coverage), so
// nothing about the Japanese type changes — only the Latin display voice.
const displayFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display-latin" });
const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-jp" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const title = "Kehai Engine — Attendance & Event Intelligence";
const description =
  "Geospatial, QR-verified attendance and event intelligence platform. Secure check-ins, live dashboards, and AI-grounded analytics.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kehai-engine-web.vercel.app"),
  title,
  description,
  // Root default -- a page that sets its own metadata (e.g. an event
  // detail page) overrides this with its own canonical path.
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    siteName: "Kehai Engine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kehai",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#0a0e14",
  // Needed for the fixed mobile bottom nav's own safe-area padding
  // (env(safe-area-inset-bottom)) to resolve to anything but 0 on a
  // notched/gesture-bar phone -- without this, the page renders inside
  // the safe area by default and the env() variables are meaningless.
  viewportFit: "cover" as const,
};

// Forces every page under this layout to render per-request rather than
// be statically prerendered at build time — required so process.env.API_URL
// below reflects the container's actual runtime value, not whatever (or
// nothing) was set during the Docker build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read server-side only (not NEXT_PUBLIC_) so this reflects the real
  // runtime value on every request — no rebuild needed if it changes.
  const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  return (
    // ViewTransitions must wrap <html> itself (next-view-transitions'
    // contract) -- it's what lets useTransitionRouter/its <Link> wrap
    // Next's navigation in a real document.startViewTransition(), which
    // drives the root page cross-fade (globals.css's page-vt-exit/enter).
    <ViewTransitions>
      <html lang="en" className={`${notoJp.variable} ${displayFont.variable} ${inter.variable} ${mono.variable}`}>
        {/* pb-24 clears MobileBottomNav's floating pill -- its own h-16
            (64px) plus the gap it now floats above the edge by, plus its
            safe-area padding -- with room to spare, so the fixed bar never
            overlaps a page's own bottom content (including Footer). Desktop
            has no bottom nav at all, hence sm:pb-0. */}
        <body className="min-h-screen bg-void-950 pb-24 font-sans antialiased sm:pb-0">
          <ApiBaseSetter apiBase={apiBase} />
          <StandaloneModeFlag />
          <CustomCursor />
          {/* Temporary, sitewide preview: the landing page's own katakana/
              kanji "digital rain" (previously only in its hero) rendered
              once here so it shows behind every route -- desktop browser,
              mobile browser tab, and installed PWA alike, deliberately
              unconditional this time since that's what was asked for.
              Fixed + z-0 so it sits behind each page's own PageGlow/content
              (those render later in the DOM at the same z-index) and never
              scrolls or intercepts clicks (KatakanaRain is pointer-events-none). */}
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <KatakanaRain columns={18} className="opacity-40" />
          </div>
          <LocaleProvider>
            <AuthProvider>
              <PageTransition>{children}</PageTransition>
              {/* Rendered here, once, rather than per-page from NavBar --
                  it needs to be a single instance that survives every
                  client-side navigation (not remounted inside
                  PageTransition's own per-route wrapper) for its active-tab
                  indicator to animate as a continuous slide between tabs
                  instead of snapping fresh into place on every route. */}
              <MobileBottomNav />
            </AuthProvider>
          </LocaleProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
