import type { Metadata } from "next";
import { Noto_Sans_JP, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ApiBaseSetter } from "@/components/ApiBaseSetter";

const notoJp = Noto_Sans_JP({ subsets: ["latin"], weight: ["500", "700", "900"], variable: "--font-jp" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Kehai Engine — Attendance & Event Intelligence",
  description:
    "Geospatial, QR-verified attendance and event intelligence platform. Secure check-ins, live dashboards, and AI-grounded analytics.",
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
    <html lang="en" className={`${notoJp.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-void-950 font-sans antialiased">
        <ApiBaseSetter apiBase={apiBase} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
