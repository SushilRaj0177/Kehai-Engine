import { z } from "zod";

// Smallest fence we accept. Below this, ordinary phone GPS drift (often
// 5–15m outdoors, worse indoors) would reject honest attendees standing in
// the room. Mirrored in apps/web/lib/geofence.ts.
export const MIN_GEOFENCE_RADIUS_M = 10;
export const MAX_GEOFENCE_RADIUS_M = 5000;

export const locationSourceSchema = z.enum(["GPS", "SEARCH", "PIN", "MANUAL"]);

export const locationMetaFields = {
  locationSource: locationSourceSchema.optional().nullable(),
  locationAccuracyM: z.coerce.number().int().min(0).max(100000).optional().nullable(),
};
