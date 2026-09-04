const EARTH_RADIUS_M = 6_371_000;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Great-circle distance between two coordinates, in meters (Haversine). */
export function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_M * c;
}

export function isValidCoordinate(c: Coordinates): boolean {
  return (
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    c.latitude >= -90 &&
    c.latitude <= 90 &&
    c.longitude >= -180 &&
    c.longitude <= 180 &&
    // (0,0) is "null island" — virtually always a broken/mocked GPS reading
    !(c.latitude === 0 && c.longitude === 0)
  );
}

export type LocationConfidence = "high" | "medium" | "low";

/**
 * Confidence in the reported position, derived from the device's own
 * accuracy radius (in meters), as reported by the Geolocation API.
 * This is honest about uncertainty rather than pretending GPS is exact.
 */
export function classifyConfidence(accuracyMeters: number | null | undefined): LocationConfidence {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return "low";
  if (accuracyMeters <= 20) return "high";
  if (accuracyMeters <= 75) return "medium";
  return "low";
}

export interface GeofenceCheckInput {
  eventLocation: Coordinates;
  geofenceRadiusM: number;
  userLocation: Coordinates;
  accuracyMeters: number | null | undefined;
}

export interface GeofenceCheckResult {
  withinFence: boolean;
  distanceMeters: number;
  confidence: LocationConfidence;
  /** Effective radius after widening for poor GPS accuracy, still capped sanely. */
  effectiveRadiusM: number;
  reason?: string;
}

/**
 * Verifies a device position against an event's geofence.
 *
 * We widen the tolerance by the device's reported accuracy (up to a sane
 * cap) rather than a hard-edged radius check — a phone reporting ±40m
 * accuracy standing 110m from a 100m-radius fence is not lying, it is
 * within its own margin of error. This is a defensible, honest model of
 * uncertainty — not a claim of spoof-proof verification (see PRIVACY.md /
 * README "Limitations").
 */
export function checkGeofence(input: GeofenceCheckInput): GeofenceCheckResult {
  const { eventLocation, geofenceRadiusM, userLocation, accuracyMeters } = input;

  if (!isValidCoordinate(userLocation)) {
    return {
      withinFence: false,
      distanceMeters: Infinity,
      confidence: "low",
      effectiveRadiusM: geofenceRadiusM,
      reason: "Invalid or unavailable device coordinates",
    };
  }

  const distanceMeters = haversineDistanceMeters(eventLocation, userLocation);
  const confidence = classifyConfidence(accuracyMeters);

  const accuracyPadding = Math.min(Math.max(accuracyMeters ?? 0, 0), 150);
  const effectiveRadiusM = geofenceRadiusM + accuracyPadding;

  return {
    withinFence: distanceMeters <= effectiveRadiusM,
    distanceMeters,
    confidence,
    effectiveRadiusM,
  };
}
