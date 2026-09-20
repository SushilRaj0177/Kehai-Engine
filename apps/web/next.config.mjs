/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Produces a self-contained .next/standalone bundle with only the
  // node_modules actually needed at runtime (traced from real imports) —
  // needed for our own Docker image (docker-compose.yml), which otherwise
  // ships a pnpm workspace's symlinked node_modules pointing at a store
  // directory that doesn't exist in the image. Vercel has its own
  // serverless packaging and doesn't want this — its own runtime doesn't
  // run a single server.js the way standalone output expects, so skip it
  // there (Vercel sets process.env.VERCEL during its builds).
  output: process.env.VERCEL ? undefined : "standalone",
  // No middleware.ts (this whole app is client-rendered, every page is "use
  // client"), so there's no nonce plumbing available for a strict
  // script-src — that would need per-request middleware to inject one.
  // These headers still close the cheap, real gaps: clickjacking (the QR
  // check-in and classroom-QR kiosk display pages are exactly the kind of
  // page you don't want framable), MIME-sniffing, referrer leakage, and an
  // unused-permissions surface (camera is needed for the QR scanner, so
  // it's scoped to same-origin rather than denied outright).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
