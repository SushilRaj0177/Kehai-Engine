import type { Metadata } from "next";
import { Noto_Sans_JP, Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LocaleProvider } from "@/lib/i18n";
import { ApiBaseSetter } from "@/components/ApiBaseSetter";
import { CustomCursor } from "@/components/ui/CustomCursor";

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
    <html lang="en" className={`${notoJp.variable} ${displayFont.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-void-950 font-sans antialiased">
        <ApiBaseSetter apiBase={apiBase} />
        <CustomCursor />
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
