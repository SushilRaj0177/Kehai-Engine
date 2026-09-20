import { describe, expect, it } from "vitest";
import { initErrorTracking, captureException } from "../src/lib/errorTracking.js";

describe("error tracking (no SENTRY_DSN set in test env)", () => {
  it("initErrorTracking is a no-op without SENTRY_DSN", () => {
    expect(() => initErrorTracking()).not.toThrow();
  });

  it("captureException never throws, even without SENTRY_DSN configured", () => {
    expect(() => captureException(new Error("test"), { requestId: "abc" })).not.toThrow();
    expect(() => captureException("a string error")).not.toThrow();
  });
});
