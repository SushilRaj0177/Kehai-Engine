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
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useMyOrganizations } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { toLocalDatetimeInputValue } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

export default function NewEventPage() {
  const { t } = useLocale();
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
    latitude: "",
    longitude: "",
    geofenceRadiusM: "100",
    capacity: "",
    qrRotationSeconds: "20",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationSet, setLocationSet] = useState(false);
  const [manualCoords, setManualCoords] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setLocationSet(true);
        setLocating(false);
      },
      (err) => {
        setError(err.message);
        setLocating(false);
      },
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
      setError(err instanceof ApiError ? err.message : t("eventNew.createError"));
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) return <LoadingBlock />;

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="新" className="absolute -right-4 top-0 text-[5rem] sm:text-[9rem]" />
        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("eventNew.createKicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("eventNew.title")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          {t("eventNew.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="relative z-20 mt-12 space-y-6">
          {error && <ErrorBlock message={error} />}

          <Card>
            <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("eventNew.detailsHeading")}</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <Label htmlFor="name">{t("eventNew.eventNameLabel")}</Label>
                <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="description">{t("eventNew.descriptionLabel")}</Label>
                <Textarea id="description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="venue">{t("eventNew.venueLabel")}</Label>
                <Input id="venue" required value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder={t("eventNew.venuePlaceholder")} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startsAt">{t("eventNew.startsLabel")}</Label>
                  <Input id="startsAt" type="datetime-local" required value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endsAt">{t("eventNew.endsLabel")}</Label>
                  <Input id="endsAt" type="datetime-local" required value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="capacity">{t("eventNew.capacityLabel")}</Label>
                <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t("eventNew.geofenceHeading")}
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant={locationSet ? "secondary" : "cyan"} loading={locating} onClick={useMyLocation}>
                  {locating ? t("eventNew.locating") : t("eventNew.useMyLocation")}
                </Button>
                {locationSet && <span className="text-sm text-kehai-400">✓ {form.latitude}, {form.longitude}</span>}
              </div>
              <p className="text-[11px] text-white/35">
                {locationSet ? t("eventNew.locationSetHint") : t("eventNew.locationNotSetHint")}
              </p>

              <button
                type="button"
                onClick={() => setManualCoords((s) => !s)}
                className="text-xs font-medium text-white/45 hover:text-white/80"
              >
                {manualCoords ? t("common.cancel") : t("eventNew.enterManually")}
              </button>

              {manualCoords && (
                <div className="grid grid-cols-1 gap-4 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="lat">{t("eventNew.latitudeLabel")}</Label>
                    <Input
                      id="lat"
                      required
                      value={form.latitude}
                      onChange={(e) => {
                        set("latitude", e.target.value);
                        setLocationSet(!!e.target.value && !!form.longitude);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">{t("eventNew.longitudeLabel")}</Label>
                    <Input
                      id="lng"
                      required
                      value={form.longitude}
                      onChange={(e) => {
                        set("longitude", e.target.value);
                        setLocationSet(!!form.latitude && !!e.target.value);
                      }}
                    />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="border-t border-white/[0.06] pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex w-full items-center justify-between py-2 text-left text-sm font-semibold text-white/60 hover:text-white"
            >
              <span>{t("eventNew.advancedSettings")}</span>
              <span className="text-white/35">{showAdvanced ? "−" : "+"}</span>
            </button>
            {!showAdvanced && <p className="text-[11px] text-white/35">{t("eventNew.advancedSettingsHint")}</p>}

            {showAdvanced && (
              <Card className="mt-3">
                <CardBody className="space-y-4">
                  <div>
                    <Label htmlFor="radius">{t("eventNew.radiusLabel")}</Label>
                    <Input id="radius" type="number" min={10} max={5000} required value={form.geofenceRadiusM} onChange={(e) => set("geofenceRadiusM", e.target.value)} />
                    <p className="mt-1 text-[11px] text-white/35">
                      {t("eventNew.radiusHelp")}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="qrRotation">{t("eventNew.rotationLabel")}</Label>
                    <QrRotationInput
                      value={Number(form.qrRotationSeconds) || 20}
                      onChange={(seconds) => set("qrRotationSeconds", String(seconds))}
                    />
                    <p className="mt-2 text-[11px] text-white/35">
                      {t("eventNew.rotationHelp")}
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!locationSet}>
            {t("eventNew.submit")}
          </Button>
        </form>
      </div>
    </ClickRippleLayer>
  );
}
