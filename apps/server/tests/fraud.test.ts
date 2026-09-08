import { describe, expect, it } from "vitest";
import { checkImpossibleTravel, isDuplicateLocation, hasZeroAccuracy } from "../src/utils/fraud.js";

const chennaiCentral = { latitude: 13.0827, longitude: 80.2707 };
const mumbai = { latitude: 19.076, longitude: 72.8777 }; // ~1030km from Chennai

describe("checkImpossibleTravel", () => {
  it("is false with no previous check-in to compare against", () => {
    expect(checkImpossibleTravel({ location: chennaiCentral, at: new Date() }, null)).toBe(false);
  });

  it("is false for a plausible walk across a venue a minute later", () => {
    const now = new Date();
    const nearby = { latitude: chennaiCentral.latitude + 0.0005, longitude: chennaiCentral.longitude };
    const previous = { location: chennaiCentral, at: new Date(now.getTime() - 60_000) };
    expect(checkImpossibleTravel({ location: nearby, at: now }, previous)).toBe(false);
  });

  it("is true for two cities 1000km+ apart within the same minute", () => {
    const now = new Date();
    const previous = { location: chennaiCentral, at: new Date(now.getTime() - 60_000) };
    expect(checkImpossibleTravel({ location: mumbai, at: now }, previous)).toBe(true);
  });

  it("is false for the same long distance given enough elapsed time (an overnight flight)", () => {
    const now = new Date();
    const previous = { location: chennaiCentral, at: new Date(now.getTime() - 6 * 3_600_000) };
    expect(checkImpossibleTravel({ location: mumbai, at: now }, previous)).toBe(false);
  });
});

describe("isDuplicateLocation", () => {
  const now = new Date();

  it("is false with no other check-ins", () => {
    expect(isDuplicateLocation({ location: chennaiCentral, at: now }, [])).toBe(false);
  });

  it("is true when another check-in landed on the exact same coordinate fix nearby in time", () => {
    const others = [{ location: { ...chennaiCentral }, at: new Date(now.getTime() - 30_000) }];
    expect(isDuplicateLocation({ location: chennaiCentral, at: now }, others)).toBe(true);
  });

  it("is false when the other check-in's coordinates differ even slightly", () => {
    const others = [{ location: { latitude: chennaiCentral.latitude + 0.001, longitude: chennaiCentral.longitude }, at: now }];
    expect(isDuplicateLocation({ location: chennaiCentral, at: now }, others)).toBe(false);
  });

  it("is false when the identical coordinate is outside the time window", () => {
    const others = [{ location: { ...chennaiCentral }, at: new Date(now.getTime() - 60 * 60_000) }];
    expect(isDuplicateLocation({ location: chennaiCentral, at: now }, others)).toBe(false);
  });
});

describe("hasZeroAccuracy", () => {
  it("flags exactly 0", () => {
    expect(hasZeroAccuracy(0)).toBe(true);
  });
  it("does not flag a normal accuracy reading", () => {
    expect(hasZeroAccuracy(12)).toBe(false);
  });
  it("does not flag a missing reading", () => {
    expect(hasZeroAccuracy(null)).toBe(false);
    expect(hasZeroAccuracy(undefined)).toBe(false);
  });
});
