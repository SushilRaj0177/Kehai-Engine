/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Produces a self-contained .next/standalone bundle with only the
  // node_modules actually needed at runtime (traced from real imports) —
  // avoids shipping a pnpm workspace's symlinked node_modules into the
  // final Docker image, which was pointing at a store directory that
  // never existed in that image.
  output: "standalone",
};

export default nextConfig;
