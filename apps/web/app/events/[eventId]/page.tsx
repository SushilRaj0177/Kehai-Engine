import type { Metadata } from "next";
import { EventDetailClient } from "./EventDetailClient";

// Server-side only, separate from the client EventDetailClient's own
// useEvent() fetch -- this one exists purely to build real per-event
// metadata (title, description, canonical URL) for crawlers and link
// previews, which generateMetadata can't get from a client component.
// GET /api/events/:eventId uses optionalAuth, so this works with no token.
async function fetchEventForMetadata(eventId: string) {
  const apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${apiBase}/api/events/${eventId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { name: string; description: string | null; venue: string };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<Metadata> {
  const { eventId } = await params;
  const event = await fetchEventForMetadata(eventId);

  if (!event) {
    return { title: "Event — Kehai Engine" };
  }

  const title = `${event.name} — Kehai Engine`;
  const description = event.description
    ? event.description.slice(0, 160)
    : `${event.venue} · QR + geofence verified attendance on Kehai Engine.`;

  return {
    title,
    description,
    alternates: { canonical: `/events/${eventId}` },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}
