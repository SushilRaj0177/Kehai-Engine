import { describe, expect, it } from "vitest";
import { checkGeofence, haversineDistanceMeters, isValidCoordinate, classifyConfidence } from "../src/utils/geo.js";

describe("haversineDistanceMeters", () => {
  it("returns ~0 for identical coordinates", () => {
    const p = { latitude: 12.8231, longitude: 80.0444 };
    expect(haversineDistanceMeters(p, p)).toBeCloseTo(0, 3);
  });

  it("returns a known real-world distance within tolerance", () => {
    // Chennai Central to Chennai Airport, ~ 18-19km as the crow flies.
    const chennaiCentral = { latitude: 13.0827, longitude: 80.2707 };
    const chennaiAirport = { latitude: 12.9941, longitude: 80.1709 };
    const d = haversineDistanceMeters(chennaiCentral, chennaiAirport);
    expect(d).toBeGreaterThan(12000);
    expect(d).toBeLessThan(16000);
  });
});

describe("isValidCoordinate", () => {
  it("rejects null island (0,0) as almost certainly a broken reading", () => {
    expect(isValidCoordinate({ latitude: 0, longitude: 0 })).toBe(false);
  });
  it("rejects out-of-range values", () => {
    expect(isValidCoordinate({ latitude: 999, longitude: 0 })).toBe(false);
    expect(isValidCoordinate({ latitude: 0, longitude: -200 })).toBe(false);
  });
  it("accepts a real coordinate", () => {
    expect(isValidCoordinate({ latitude: 12.8231, longitude: 80.0444 })).toBe(true);
  });
});

describe("classifyConfidence", () => {
  it("classifies tight GPS accuracy as high", () => {
    expect(classifyConfidence(8)).toBe("high");
  });
  it("classifies loose accuracy as low", () => {
    expect(classifyConfidence(500)).toBe("low");
  });
  it("treats missing accuracy as low confidence", () => {
    expect(classifyConfidence(undefined)).toBe("low");
    expect(classifyConfidence(null)).toBe("low");
  });
});

describe("checkGeofence", () => {
  const event = { latitude: 12.8231, longitude: 80.0444 };

  it("passes when the user is well within the radius", () => {
    const result = checkGeofence({
      eventLocation: event,
      geofenceRadiusM: 100,
      userLocation: { latitude: 12.8231, longitude: 80.0444 },
      accuracyMeters: 10,
    });
    expect(result.withinFence).toBe(true);
    expect(result.distanceMeters).toBeCloseTo(0, 1);
  });

  it("fails when the user is far outside the radius even with generous accuracy padding", () => {
    // ~1.1km away — no reasonable GPS accuracy padding should cover this.
    const result = checkGeofence({
      eventLocation: event,
      geofenceRadiusM: 100,
      userLocation: { latitude: 12.8331, longitude: 80.0444 },
      accuracyMeters: 20,
    });
    expect(result.withinFence).toBe(false);
  });

  it("widens tolerance for poor GPS accuracy near the fence edge", () => {
    // ~130m away from a 100m fence, but reported accuracy is 50m — a
    // legitimate device this close to the fence should not be unfairly
    // rejected purely because of its own uncertainty.
    const result = checkGeofence({
      eventLocation: event,
      geofenceRadiusM: 100,
      userLocation: { latitude: 12.82425, longitude: 80.0444 },
      accuracyMeters: 50,
    });
    expect(result.effectiveRadiusM).toBe(150);
    expect(result.withinFence).toBe(true);
  });

  it("rejects invalid coordinates outright", () => {
    const result = checkGeofence({
      eventLocation: event,
      geofenceRadiusM: 100,
      userLocation: { latitude: 0, longitude: 0 },
      accuracyMeters: 10,
    });
    expect(result.withinFence).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("caps accuracy padding so a wildly inaccurate reading can't pass from anywhere", () => {
    const result = checkGeofence({
      eventLocation: event,
      geofenceRadiusM: 100,
      userLocation: { latitude: 13.5, longitude: 81.5 }, // >100km away
      accuracyMeters: 999999,
    });
    expect(result.effectiveRadiusM).toBeLessThanOrEqual(100 + 150);
    expect(result.withinFence).toBe(false);
  });
});
