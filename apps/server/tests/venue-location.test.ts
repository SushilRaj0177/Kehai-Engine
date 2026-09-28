import { describe, expect, it } from "vitest";
import { createEventSchema, updateEventSchema } from "../src/validators/event.js";
import { updateClassroomSchema } from "../src/validators/classroom.js";
import { MIN_GEOFENCE_RADIUS_M } from "../src/validators/location.js";

const base = {
  name: "Launch",
  venue: "Hall A",
  startsAt: "2026-10-01T10:00:00Z",
  endsAt: "2026-10-01T12:00:00Z",
  latitude: 35.68,
  longitude: 139.76,
};

describe("venue location validation", () => {
  it("rejects a fence radius below the minimum", () => {
    expect(createEventSchema.safeParse({ ...base, geofenceRadiusM: MIN_GEOFENCE_RADIUS_M - 1 }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, geofenceRadiusM: MIN_GEOFENCE_RADIUS_M }).success).toBe(true);
  });

  it("accepts and constrains the location source", () => {
    expect(createEventSchema.safeParse({ ...base, locationSource: "SEARCH" }).success).toBe(true);
    expect(createEventSchema.safeParse({ ...base, locationSource: "WIFI" }).success).toBe(false);
    const gps = updateEventSchema.safeParse({ latitude: 1, longitude: 2, locationSource: "GPS", locationAccuracyM: 8 });
    expect(gps.success && gps.data.locationAccuracyM).toBe(8);
  });

  it("lets a classroom geofence be cleared only all-or-nothing", () => {
    expect(updateClassroomSchema.safeParse({ latitude: null, longitude: null, geofenceRadiusM: null }).success).toBe(true);
    expect(updateClassroomSchema.safeParse({ latitude: null, longitude: 2, geofenceRadiusM: 50 }).success).toBe(false);
  });
});
