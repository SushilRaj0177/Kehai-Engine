"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { QrRotationInput } from "@/components/ui/QrRotationInput";
import { ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useMyOrganizations, useEvent } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { toLocalDatetimeInputValue } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import { SURFACE, SectionHead } from "@/components/ui/Hud";
import { useIsStandalone } from "@/lib/useStandalone";
import { VenueLocationPicker } from "@/components/VenueLocationPicker";
import { emptyVenueLocation, hasCoords, venueError, venueFromRecord, venuePayload, type VenueLocation } from "@/lib/geofence";

const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);
// Matches the "restart" convention already used elsewhere for an
// effectively open-ended event — the schema's endsAt column stays
// non-nullable (every place that reads it, from the check-in window to
// exports, would otherwise need null-handling), so "no fixed end time"
// is represented as a far-future date rather than a real null.
const OPEN_ENDED_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;

export default function NewEventPage() {
  const { t } = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const { data: orgs, isLoading } = useMyOrganizations();
  const org = orgs?.find((o) => o.slug === slug);
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFromId = searchParams.get("from") ?? undefined;
  const { data: sourceEvent } = useEvent(duplicateFromId);
  const [prefilled, setPrefilled] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    venue: "",
    startsAt: toLocalDatetimeInputValue(defaultStart),
    endsAt: toLocalDatetimeInputValue(defaultEnd),
    capacity: "",
    qrRotationSeconds: "20",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState<VenueLocation>(() => emptyVenueLocation());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [openEnded, setOpenEnded] = useState(false);
  const isStandalone = useIsStandalone();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Copies everything except dates and registrations/attendance (which
  // wouldn't make sense to carry over) — the organizer still picks a new
  // date, so we deliberately leave the default tomorrow-start in place
  // rather than reusing the source event's now-likely-past dates.
  useEffect(() => {
    if (!sourceEvent || prefilled) return;
    setForm((f) => ({
      ...f,
      name: `${sourceEvent.name} (copy)`,
      description: sourceEvent.description ?? "",
      venue: sourceEvent.venue,
      capacity: sourceEvent.capacity != null ? String(sourceEvent.capacity) : "",
      qrRotationSeconds: String(sourceEvent.qrRotationSeconds),
    }));
    setLoc(venueFromRecord(sourceEvent));
    setPrefilled(true);
  }, [sourceEvent, prefilled]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    const locErr = venueError(loc);
    if (locErr) {
      setError(t(locErr));
      return;
    }
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
          endsAt: openEnded
            ? new Date(new Date(form.startsAt).getTime() + OPEN_ENDED_HORIZON_MS).toISOString()
            : new Date(form.endsAt).toISOString(),
          ...venuePayload(loc),
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

  if (isStandalone) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="page-stagger relative mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{t("eventNew.createKicker")}</p>
            <h1 className="mt-1.5 font-display text-[26px] font-black leading-tight text-white">{t("eventNew.title")}</h1>
            <p className="mt-2 text-[14px] text-white/45">{t("eventNew.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <ErrorBlock message={error} />}

            <section>
              <SectionHead title={t("eventNew.detailsHeading")} />
              <div className={`${SURFACE} space-y-4 p-4`}>
                <div>
                  <Label htmlFor="s-name">{t("eventNew.eventNameLabel")}</Label>
                  <Input id="s-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="s-description">{t("eventNew.descriptionLabel")}</Label>
                  <Textarea id="s-description" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="s-venue">{t("eventNew.venueLabel")}</Label>
                  <Input
                    id="s-venue"
                    required
                    value={form.venue}
                    onChange={(e) => set("venue", e.target.value)}
                    placeholder={t("eventNew.venuePlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="s-startsAt">{t("eventNew.startsLabel")}</Label>
                  <Input
                    id="s-startsAt"
                    type="datetime-local"
                    required
                    value={form.startsAt}
                    onChange={(e) => set("startsAt", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="s-endsAt">{t("eventNew.endsLabel")}</Label>
                  <Input
                    id="s-endsAt"
                    type="datetime-local"
                    required={!openEnded}
                    disabled={openEnded}
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={openEnded}
                      onChange={(e) => setOpenEnded(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-kehai-500"
                    />
                    {t("eventNew.noEndTime")}
                  </label>
                  <p className="mt-1.5 text-[11px] text-white/35">{t("eventNew.noEndTimeHint")}</p>
                </div>
                <div>
                  <Label htmlFor="s-capacity">{t("eventNew.capacityLabel")}</Label>
                  <Input id="s-capacity" type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
                </div>
              </div>
            </section>

            <section>
              <SectionHead title={t("eventNew.geofenceHeading")} />
              <div className={`${SURFACE} space-y-4 p-4`}>
                <VenueLocationPicker value={loc} onChange={setLoc} idPrefix="s-venue" />
              </div>
            </section>

            <section>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between px-1 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white/45"
              >
                <span>{t("eventNew.advancedSettings")}</span>
                <span className="text-white/35">{showAdvanced ? "−" : "+"}</span>
              </button>
              {!showAdvanced && <p className="px-1 text-[11px] text-white/35">{t("eventNew.advancedSettingsHint")}</p>}

              {showAdvanced && (
                <div className={`${SURFACE} mt-3 space-y-4 p-4`}>
                  <div>
                    <Label htmlFor="s-qrRotation">{t("eventNew.rotationLabel")}</Label>
                    <QrRotationInput
                      value={Number(form.qrRotationSeconds) || 20}
                      onChange={(seconds) => set("qrRotationSeconds", String(seconds))}
                    />
                    <p className="mt-2 text-[11px] text-white/35">{t("eventNew.rotationHelp")}</p>
                  </div>
                </div>
              )}
            </section>

            <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!hasCoords(loc)}>
              {t("eventNew.submit")}
            </Button>
          </form>
        </div>
      </ClickRippleLayer>
    );
  }

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="page-stagger relative mx-auto max-w-3xl px-6 py-10 sm:py-14 lg:max-w-6xl">
        <KanjiMark glyph="新" className="absolute -right-4 top-0 text-[5rem] sm:text-[9rem]" />
        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("eventNew.createKicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("eventNew.title")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">
          {t("eventNew.subtitle")}
        </p>

        {/* Wide screens: details on the left, the venue map on the right
            (sticky), so the whole form is visible without scrolling. */}
        {error && <ErrorBlock message={error} className="relative z-20 mt-8" />}
        <form
          onSubmit={handleSubmit}
          className="relative z-20 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"
        >
          <Card className="lg:col-start-1">
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
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    required={!openEnded}
                    disabled={openEnded}
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={openEnded}
                    onChange={(e) => setOpenEnded(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-kehai-500"
                  />
                  {t("eventNew.noEndTime")}
                </label>
                <p className="mt-1.5 text-[11px] text-white/35">{t("eventNew.noEndTimeHint")}</p>
              </div>
              <div>
                <Label htmlFor="capacity">{t("eventNew.capacityLabel")}</Label>
                <Input id="capacity" type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              </div>
            </CardBody>
          </Card>

          <Card className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t("eventNew.geofenceHeading")}
            </CardHeader>
            <CardBody className="space-y-4">
              <VenueLocationPicker value={loc} onChange={setLoc} idPrefix="venue" />
            </CardBody>
          </Card>

          <div className="border-t border-white/[0.06] pt-2 lg:col-start-1">
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

          <Button type="submit" size="lg" className="w-full lg:col-start-1" loading={loading} disabled={!hasCoords(loc)}>
            {t("eventNew.submit")}
          </Button>
        </form>
      </div>
    </ClickRippleLayer>
  );
}
