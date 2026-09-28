"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n";
import {
  MAX_GEOFENCE_RADIUS_M,
  MIN_GEOFENCE_RADIUS_M,
  RADIUS_PRESETS,
  clampRadius,
  geocode,
  getPreciseFix,
  hasCoords,
  isApproximate,
  type GeocodeResult,
  type VenueLocation,
} from "@/lib/geofence";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap").then((m) => m.LocationPickerMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-white/[0.03]" />,
});

// One venue picker for every surface (desktop, mobile browser, PWA): the
// parent supplies the container (Card / SURFACE); Button already switches
// to the pwa-* skin in standalone mode, so the language stays consistent.
export function VenueLocationPicker({
  value,
  onChange,
  idPrefix = "venue",
  showRadius = true,
}: {
  value: VenueLocation;
  onChange: (next: VenueLocation) => void;
  idPrefix?: string;
  showRadius?: boolean;
}) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  // Set when a result is picked, so writing its name into the box doesn't
  // immediately fire a fresh search and re-open the dropdown.
  const skipSearch = useRef(false);

  const has = hasCoords(value);
  const lat = has ? Number(value.latitude) : null;
  const lng = has ? Number(value.longitude) : null;
  const radiusNum = Math.max(MIN_GEOFENCE_RADIUS_M, Number(value.radiusM) || MIN_GEOFENCE_RADIUS_M);
  const precise = value.source === "GPS";
  const approximate = has && (isApproximate(value.source) || value.source == null);
  const radiusTooLow = value.radiusM.trim() !== "" && Number(value.radiusM) < MIN_GEOFENCE_RADIUS_M;
  const accuracyWide = precise && value.accuracyM != null && value.accuracyM > radiusNum * 0.6;

  // Debounced geocoder search.
  useEffect(() => {
    const q = query.trim();
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    if (q.length < 3) {
      setResults(null);
      setSearchError(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        setResults(await geocode(q, locale, ctrl.signal));
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSearchError(true);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, locale]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pickResult(r: GeocodeResult) {
    onChange({ ...value, latitude: r.latitude.toFixed(6), longitude: r.longitude.toFixed(6), source: "SEARCH", accuracyM: null });
    skipSearch.current = true;
    setQuery(r.name);
    setResults(null);
    setOpen(false);
    setFocusKey((k) => k + 1);
  }

  function pickOnMap(la: number, ln: number) {
    onChange({ ...value, latitude: la.toFixed(6), longitude: ln.toFixed(6), source: "PIN", accuracyM: null });
  }

  async function lockToGps() {
    setLocating(true);
    setGpsError(null);
    try {
      const fix = await getPreciseFix();
      onChange({ ...value, latitude: fix.latitude.toFixed(6), longitude: fix.longitude.toFixed(6), source: "GPS", accuracyM: Math.round(fix.accuracy) });
      setFocusKey((k) => k + 1);
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      setGpsError(code === 1 ? t("venuePicker.gpsDenied") : code === 3 ? t("venuePicker.gpsTimeout") : t("venuePicker.gpsUnavailable"));
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 transition-colors focus-within:border-kehai-400/50 focus-within:bg-white/[0.05]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/40" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id={`${idPrefix}-search`}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results?.[0]) pickResult(results[0]);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={t("venuePicker.searchPlaceholder")}
            aria-label={t("venuePicker.searchPlaceholder")}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          {searching && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-kehai-400" aria-hidden />}
        </div>
        {open && (results || searchError) && (
          <div className="absolute inset-x-0 top-full z-[1000] mt-1.5 overflow-hidden rounded-xl border border-white/10 bg-void-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
            {searchError ? (
              <p className="px-4 py-3 text-xs text-white/50">{t("venuePicker.searchError")}</p>
            ) : !results?.length ? (
              <p className="px-4 py-3 text-xs text-white/50">{t("venuePicker.noResults")}</p>
            ) : (
              <ul className="max-h-72 divide-y divide-white/[0.05] overflow-y-auto">
                {results.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => pickResult(r)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05]">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-shu-400" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white/85">{r.name}</span>
                        {r.detail && <span className="block truncate text-[11px] text-white/40">{r.detail}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="venue-map relative isolate h-56 overflow-hidden rounded-xl border border-white/10 sm:h-72">
        <LocationPickerMap lat={lat} lng={lng} radius={radiusNum} precise={precise} focusKey={focusKey} onPick={pickOnMap} />
        <div className="pointer-events-none absolute right-2.5 top-2.5 z-[500] flex flex-wrap justify-end gap-1.5">
          {has ? (
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                precise ? "border-kehai-400/40 bg-kehai-500/15 text-kehai-300" : "border-amber-400/40 bg-amber-500/15 text-amber-300"
              }`}
            >
              {precise
                ? value.accuracyM != null
                  ? t("venuePicker.badgeGpsAcc", { m: value.accuracyM })
                  : t("venuePicker.badgeGps")
                : t(`venuePicker.badge${value.source ?? "UNKNOWN"}`)}
            </span>
          ) : (
            <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-md">
              {t("venuePicker.badgeNone")}
            </span>
          )}
        </div>
      </div>
      <p className="-mt-2.5 px-0.5 text-[11px] text-white/35">{has ? t("venuePicker.mapHintSet") : t("venuePicker.mapHintEmpty")}</p>

      {/* Precision status */}
      {has && (precise ? (
        <div className="flex gap-3 rounded-xl border border-kehai-400/25 bg-kehai-500/[0.07] p-3.5">
          <ShieldIcon className="text-kehai-300" />
          <div className="min-w-0 text-[12px] leading-relaxed">
            <p className="font-semibold text-kehai-200">{t("venuePicker.preciseTitle")}</p>
            <p className="mt-0.5 text-white/55">{accuracyWide ? t("venuePicker.preciseWide", { m: value.accuracyM ?? 0 }) : t("venuePicker.preciseBody")}</p>
          </div>
        </div>
      ) : approximate ? (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-3.5">
          <WarnIcon className="text-amber-300" />
          <div className="min-w-0 text-[12px] leading-relaxed">
            <p className="font-semibold text-amber-200">{t("venuePicker.approxTitle")}</p>
            <p className="mt-0.5 text-white/55">{t("venuePicker.approxBody")}</p>
          </div>
        </div>
      ) : null)}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" size="sm" variant={precise ? "secondary" : "cyan"} loading={locating} onClick={lockToGps}>
          {locating ? t("venuePicker.locating") : precise ? t("venuePicker.relock") : t("venuePicker.lockHere")}
        </Button>
        <button
          type="button"
          onClick={() => setManual((s) => !s)}
          className="font-mono text-[11px] font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-white/80"
        >
          {manual ? t("venuePicker.hideCoords") : t("venuePicker.enterCoords")}
        </button>
      </div>
      <p className="-mt-1 text-[11px] text-white/35">{t("venuePicker.lockHint")}</p>
      {gpsError && <p className="text-xs text-shu-300">{gpsError}</p>}

      {manual && (
        <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
          <div>
            <Label htmlFor={`${idPrefix}-lat`}>{t("eventNew.latitudeLabel")}</Label>
            <Input
              id={`${idPrefix}-lat`}
              inputMode="decimal"
              value={value.latitude}
              onChange={(e) => onChange({ ...value, latitude: e.target.value, source: "MANUAL", accuracyM: null })}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-lng`}>{t("eventNew.longitudeLabel")}</Label>
            <Input
              id={`${idPrefix}-lng`}
              inputMode="decimal"
              value={value.longitude}
              onChange={(e) => onChange({ ...value, longitude: e.target.value, source: "MANUAL", accuracyM: null })}
            />
          </div>
        </div>
      )}

      {/* Radius */}
      {showRadius && (
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor={`${idPrefix}-radius`}>{t("venuePicker.radiusLabel")}</Label>
            <div className="flex items-baseline gap-1">
              <input
                id={`${idPrefix}-radius`}
                type="number"
                inputMode="numeric"
                min={MIN_GEOFENCE_RADIUS_M}
                max={MAX_GEOFENCE_RADIUS_M}
                step={1}
                value={value.radiusM}
                onChange={(e) => onChange({ ...value, radiusM: e.target.value })}
                onBlur={() => onChange({ ...value, radiusM: clampRadius(value.radiusM) })}
                aria-invalid={radiusTooLow}
                className={`w-20 rounded-lg border bg-white/[0.04] px-2 py-1 text-right font-display text-lg font-bold text-white focus:outline-none ${
                  radiusTooLow ? "border-shu-500/60" : "border-white/10 focus:border-kehai-400/50"
                }`}
              />
              <span className="text-sm font-semibold text-white/45">m</span>
            </div>
          </div>
          <input
            type="range"
            aria-label={t("venuePicker.radiusLabel")}
            min={MIN_GEOFENCE_RADIUS_M}
            max={1000}
            step={5}
            value={Math.min(1000, radiusNum)}
            onChange={(e) => onChange({ ...value, radiusM: e.target.value })}
            className="mt-3 w-full accent-shu-500"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RADIUS_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ ...value, radiusM: String(r) })}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold transition-colors ${
                  Number(value.radiusM) === r ? "border-shu-500/50 bg-shu-500/15 text-shu-200" : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
                }`}
              >
                {r}m
              </button>
            ))}
          </div>
          <p className={`mt-2 text-[11px] ${radiusTooLow ? "text-shu-300" : "text-white/35"}`}>
            {t("venuePicker.radiusHelp", { min: MIN_GEOFENCE_RADIUS_M, max: MAX_GEOFENCE_RADIUS_M })}
          </p>
        </div>
      )}
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`mt-0.5 h-4 w-4 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`mt-0.5 h-4 w-4 shrink-0 ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

/** Persistent flag for a saved venue whose pin came from search/map/typing. */
export function ApproximateVenueNotice({ onLock, locking, className = "" }: { onLock: () => void; locking: boolean; className?: string }) {
  const { t } = useLocale();
  return (
    <div role="status" className={`flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-3.5 sm:flex-row sm:items-center ${className}`}>
      <div className="flex min-w-0 flex-1 gap-3">
        <WarnIcon className="text-amber-300" />
        <div className="min-w-0 text-[12px] leading-relaxed">
          <p className="font-semibold text-amber-200">{t("venuePicker.savedApproxTitle")}</p>
          <p className="mt-0.5 text-white/55">{t("venuePicker.savedApproxBody")}</p>
        </div>
      </div>
      <Button type="button" size="sm" variant="cyan" loading={locking} onClick={onLock} className="shrink-0 self-start sm:self-center">
        {t("venuePicker.arrivedLock")}
      </Button>
    </div>
  );
}
