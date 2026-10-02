// The web app manifest (linked from layout.tsx's metadata). The whole point
// is the QR-scanning check-in flow: a student or club member who checks in
// daily gets an "Add to Home Screen" install prompt instead of having to
// find the site in a browser tab every time.
//
// A route rather than Next's static app/manifest.ts because it varies by
// browser: Samsung Internet has a known bug where, if the manifest lists a
// maskable icon, its launch screen crops that icon and draws it on white,
// ignoring background_color (installed users saw a white screen around
// the logo on every launch). So Samsung Internet gets the manifest without
// the maskable icon and its launch screen uses the dark background_color;
// every other browser keeps the maskable icon, which Chrome needs for
// round/squircle launcher shapes.

const BACKGROUND = "#05070a"; // void-950, the app's own ground

const ANY_ICONS = [
  { src: "/icons/kehai-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/kehai-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
];
const MASKABLE_ICON = { src: "/icons/kehai-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" };

export function GET(request: Request) {
  const samsung = /SamsungBrowser\//i.test(request.headers.get("user-agent") ?? "");
  const manifest = {
    name: "Kehai Engine",
    short_name: "Kehai",
    description: "Geospatial, QR-verified attendance and event intelligence platform.",
    start_url: "/",
    display: "standalone",
    // The launch (splash) screen is drawn by the phone from these: the same
    // near-black as the app itself, so opening it never flashes white.
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    // Flat mark: red 気 (shu-500) on a solid black tile (void-950). The
    // "any" icons have transparent corners; the maskable one is full-bleed
    // with the glyph inside the safe zone.
    icons: samsung ? ANY_ICONS : [...ANY_ICONS, MASKABLE_ICON],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      // Different browsers get different bodies: never share one copy.
      Vary: "User-Agent",
      "Cache-Control": "private, no-cache",
    },
  });
}
