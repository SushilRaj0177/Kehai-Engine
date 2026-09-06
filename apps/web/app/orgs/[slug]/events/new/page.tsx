"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { QrRotationInput } from "@/components/ui/QrRotationInput";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { toLocalDatetimeInputValue } from "@/lib/format";

const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

export default function NewEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs, isLoading } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    venue: "",
    startsAt: toLocalDatetimeInputValue(defaultStart),
    endsAt: toLocalDatetimeInputValue(defaultEnd),
    latitude: "12.8231",
    longitude: "80.0444",
    geofenceRadiusM: "100",
    capacity: "",
    qrRotationSeconds: "20",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setError(null);
    setLoading(true);
    try {
      const event = await apiFetch<{ id: string }>(`/api/orgs/${org.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          venue: form.venue,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          geofenceRadiusM: Number(form.geofenceRadiusM),
          capacity: form.capacity ? Number(form.capacity) : undefined,
          qrRotationSeconds: Number(form.qrRotationSeconds),
        }),
      });
      router.push(`/orgs/${org.slug}/events/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="新" className="absolute -right-4 top-0 text-[5rem] sm:text-[9rem]" />
        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">Create</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">New event</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          Set the venue geofence carefully — this is what verifies real attendance.
        </p>

        <form onSubmit={handleSubmit} className="relative z-20 mt-12 space-y-6">
          {error && <ErrorBlock message={error} />}

          <Card>
            <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">Details</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="name">Event name</Label>
                <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="venue">Venue name</Label>
                <Input id="venue" required value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Tech Park Auditorium" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startsAt">Starts</Label>
                  <Input id="startsAt" type="datetime-local" required value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endsAt">Ends</Label>
                  <Input id="endsAt" type="datetime-local" required value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="capacity">Capacity (optional)</Label>
                <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/40">
              <span>Geofence</span>
              <button type="button" onClick={useMyLocation} className="text-shu-400 hover:text-shu-300 normal-case tracking-normal">
                {locating ? "Locating…" : "Use my current location"}
              </button>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" required value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" required value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="radius">Geofence radius (meters)</Label>
                <Input id="radius" type="number" min={10} max={5000} required value={form.geofenceRadiusM} onChange={(e) => set("geofenceRadiusM", e.target.value)} />
                <p className="mt-1 text-[11px] text-white/35">
                  Attendees must be within this radius (widened slightly for their device&apos;s own GPS uncertainty) to check in.
                </p>
              </div>
              <div>
                <Label htmlFor="qrRotation">QR rotation interval</Label>
                <QrRotationInput
                  value={Number(form.qrRotationSeconds) || 20}
                  onChange={(seconds) => set("qrRotationSeconds", String(seconds))}
                />
                <p className="mt-2 text-[11px] text-white/35">
                  How often the displayed check-in QR code refreshes — you can change this later too.
                </p>
              </div>
            </CardBody>
          </Card>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Create event (draft)
          </Button>
        </form>
      </div>
    </div>
  );
}
