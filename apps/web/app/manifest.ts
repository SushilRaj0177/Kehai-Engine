import type { MetadataRoute } from "next";

// Next's file-convention route (served at /manifest.webmanifest) — the
// whole point of this is the QR-scanning check-in flow: a student or club
// member who checks in daily gets an "Add to Home Screen" install prompt
// instead of having to find the site in a browser tab every time.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kehai Engine",
    short_name: "Kehai",
    description: "Geospatial, QR-verified attendance and event intelligence platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
