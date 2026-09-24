import type { MetadataRoute } from "next";

// Static, public, unauthenticated routes only. Anything behind auth (the
// organizer console, a specific classroom, settings, etc.) has no business
// in a sitemap -- a crawler can't get past login anyway, and listing it
// would just be noise. Event/classroom detail pages are intentionally left
// out too: they're ephemeral and ID-keyed, not the kind of stable landing
// page a sitemap is for.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kehai-engine-web.vercel.app";

  const routes = ["/", "/events", "/classrooms/join", "/trust", "/privacy", "/login", "/register"];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/events" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
