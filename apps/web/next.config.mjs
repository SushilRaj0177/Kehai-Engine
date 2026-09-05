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
};

export default nextConfig;
