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
    // near-black as the app itself.
    background_color: "#05070a",
    theme_color: "#05070a",
    // Flat mark: red 気 (shu-500) on a full-bleed black square (void-950),
    // the glyph well inside the 80% safe circle so any launcher crop keeps
    // it whole. Deliberately NO "maskable" icon: Samsung Internet's launch
    // screen draws a maskable icon cropped on a white box, ignoring
    // background_color, and installs are packaged by a server that fetches
    // this manifest itself (so serving Samsung a different one by
    // user-agent doesn't work). Without one, the launch screen is the black
    // icon on the black background_color.
    icons: [
      { src: "/icons/kehai-square-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kehai-square-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
