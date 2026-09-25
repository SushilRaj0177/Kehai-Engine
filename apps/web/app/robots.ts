import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kehai-engine-web.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        // /classrooms/join is the one public page under /classrooms/ (join
        // by code) -- listed explicitly since it's a longer, more specific
        // match than the blanket disallow below.
        allow: ["/", "/classrooms/join"],
        // No auth-gated area is worth a crawler's time, and disallowing it
        // explicitly keeps a search index from ever surfacing a login wall.
        disallow: ["/dashboard", "/settings", "/orgs/", "/classrooms/", "/my-events", "/attend/", "/home"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
