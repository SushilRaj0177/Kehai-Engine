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
    // The launch (splash) screen is drawn by the phone from these: the same
    // near-black as the app's own ground (void-950), so opening the app
    // goes straight from splash to page with no colour change.
    background_color: "#05070a",
    theme_color: "#05070a",
    // Flat mark: black 気 on a solid vermilion (shu-600) tile (the app's
    // tile mark without its gradient). The "any" icons have transparent
    // corners (they used to be opaque white, which showed as a white
    // frame); the maskable one is
    // full-bleed with the glyph inside the safe zone. New file names so no
    // phone or cache keeps serving the old glowing icon.
    icons: [
      { src: "/icons/kehai-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kehai-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/kehai-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
