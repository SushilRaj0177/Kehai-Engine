import { haversineDistanceMeters, type Coordinates } from "./geo.js";

// A GPS reading can be spoofed and a QR frame can be screenshotted and
// forwarded — neither is something a server can detect with certainty, so
// none of this blocks a check-in. What it CAN do honestly: notice patterns
// that are physically implausible or statistically unlikely for a genuine
// device, and surface them to the organizer as a flag, not a rejection.
// The organizer has context (did they see this person walk in) the server
// never will, so the call is always left to them.

export type FlagReason = "impossible_travel" | "duplicate_location" | "zero_accuracy";

const IMPOSSIBLE_TRAVEL_KMH = 250; // faster than any ordinary ground transport
const DUPLICATE_LOCATION_PRECISION = 5; // ~1.1m — a real independent GPS fix essentially never lands here twice
const DUPLICATE_LOCATION_WINDOW_MS = 5 * 60_000;

export function checkImpossibleTravel(
  current: { location: Coordinates; at: Date },
  previous: { location: Coordinates; at: Date } | null
): boolean {
  if (!previous) return false;
  const elapsedHours = Math.abs(current.at.getTime() - previous.at.getTime()) / 3_600_000;
  if (elapsedHours <= 0) return true; // two check-ins at literally the same instant, different places
  const distanceKm = haversineDistanceMeters(current.location, previous.location) / 1000;
  return distanceKm / elapsedHours > IMPOSSIBLE_TRAVEL_KMH;
}

function roundCoord(n: number): string {
  return n.toFixed(DUPLICATE_LOCATION_PRECISION);
}

/**
 * True if another attendee at the same event/session checked in from the
 * exact same coordinate fix within a short window — one real device rarely
 * produces the identical reading twice, so a match usually means the same
 * phone (or the same spoofed fix) checked multiple people in.
 */
export function isDuplicateLocation(
  current: { location: Coordinates; at: Date },
  others: { location: Coordinates; at: Date }[]
): boolean {
  const key = `${roundCoord(current.location.latitude)},${roundCoord(current.location.longitude)}`;
  return others.some((o) => {
    if (Math.abs(o.at.getTime() - current.at.getTime()) > DUPLICATE_LOCATION_WINDOW_MS) return false;
    return `${roundCoord(o.location.latitude)},${roundCoord(o.location.longitude)}` === key;
  });
}

/** accuracyMeters === 0 essentially never happens on a real device — it's
 * a strong tell for a fixed/mocked coordinate rather than a live GPS fix. */
export function hasZeroAccuracy(accuracyMeters: number | null | undefined): boolean {
  return accuracyMeters != null && accuracyMeters === 0;
}
