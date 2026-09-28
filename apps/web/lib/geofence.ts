import type { LocationSource } from "./types";

// Mirrors apps/server/src/validators/location.ts. Below 10m ordinary phone
// GPS drift would reject honest attendees standing in the room.
export const MIN_GEOFENCE_RADIUS_M = 10;
export const MAX_GEOFENCE_RADIUS_M = 5000;
export const RADIUS_PRESETS = [25, 50, 100, 250, 500] as const;

export interface VenueLocation {
  latitude: string;
  longitude: string;
  radiusM: string;
  source: LocationSource | null;
  accuracyM: number | null;
}

export function emptyVenueLocation(radiusM = 100): VenueLocation {
  return { latitude: "", longitude: "", radiusM: String(radiusM), source: null, accuracyM: null };
}

export function venueFromRecord(r: {
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusM?: number | null;
  locationSource?: LocationSource | null;
  locationAccuracyM?: number | null;
}): VenueLocation {
  return {
    latitude: r.latitude != null ? String(r.latitude) : "",
    longitude: r.longitude != null ? String(r.longitude) : "",
    radiusM: String(r.geofenceRadiusM ?? 100),
    source: r.locationSource ?? null,
    accuracyM: r.locationAccuracyM ?? null,
  };
}

export function hasCoords(v: VenueLocation): boolean {
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  return v.latitude !== "" && v.longitude !== "" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Only a GPS fix taken at the venue makes the fence a real anti-fraud check. */
export function isApproximate(source: LocationSource | null | undefined): boolean {
  return source === "SEARCH" || source === "PIN" || source === "MANUAL";
}

/** i18n key of the first problem, or null when the venue is submittable. */
export function venueError(v: VenueLocation): string | null {
  if (!hasCoords(v)) return "venuePicker.errNoLocation";
  const r = Number(v.radiusM);
  if (!Number.isFinite(r) || !Number.isInteger(r) || r < MIN_GEOFENCE_RADIUS_M || r > MAX_GEOFENCE_RADIUS_M) return "venuePicker.errRadius";
  return null;
}

export function venuePayload(v: VenueLocation) {
  return {
    latitude: Number(v.latitude),
    longitude: Number(v.longitude),
    geofenceRadiusM: Number(v.radiusM),
    locationSource: v.source ?? "MANUAL",
    locationAccuracyM: v.accuracyM != null ? Math.round(v.accuracyM) : null,
  };
}

export function clampRadius(raw: string): string {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || raw.trim() === "") return String(MIN_GEOFENCE_RADIUS_M);
  return String(Math.min(MAX_GEOFENCE_RADIUS_M, Math.max(MIN_GEOFENCE_RADIUS_M, n)));
}

export function getPreciseFix(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export interface GeocodeResult {
  id: string;
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
}

// OpenStreetMap Nominatim: free, keyless. Debounced by the caller and only
// fired on explicit typing, well inside its 1 req/s usage policy.
export async function geocode(query: string, lang: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&accept-language=${lang}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const rows = (await res.json()) as { place_id: number; name?: string; display_name: string; lat: string; lon: string }[];
  return rows.map((r) => {
    const parts = r.display_name.split(", ");
    const name = r.name || parts[0];
    return {
      id: String(r.place_id),
      name,
      detail: parts.filter((p) => p !== name).slice(0, 4).join(", "),
      latitude: Number(r.lat),
      longitude: Number(r.lon),
    };
  });
}
