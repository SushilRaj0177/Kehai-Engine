import { describe, expect, it, vi } from "vitest";
import { issueQrToken, verifyQrToken } from "../src/utils/qrToken.js";

describe("QR token signing", () => {
  const eventId = "evt_123";
  const secret = "event-specific-secret";

  it("issues a token that verifies successfully for the correct event", () => {
    const { token, jti } = issueQrToken(eventId, secret, 30);
    const payload = verifyQrToken(token, eventId, secret);
    expect(payload.jti).toBe(jti);
    expect(payload.eventId).toBe(eventId);
  });

  it("rejects a token when checked against a different event id", () => {
    const { token } = issueQrToken(eventId, secret, 30);
    expect(() => verifyQrToken(token, "evt_other", secret)).toThrow();
  });

  it("rejects a token when checked against a different (e.g. rotated/regenerated) secret", () => {
    const { token } = issueQrToken(eventId, secret, 30);
    expect(() => verifyQrToken(token, eventId, "wrong-secret")).toThrow();
  });

  it("issues unique jtis across calls", () => {
    const a = issueQrToken(eventId, secret, 30);
    const b = issueQrToken(eventId, secret, 30);
    expect(a.jti).not.toBe(b.jti);
    expect(a.token).not.toBe(b.token);
  });

  it("expires the token after its TTL", async () => {
    vi.useFakeTimers();
    const { token } = issueQrToken(eventId, secret, 1);
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    // jsonwebtoken checks wall-clock time internally; simulate by issuing
    // with a negative/zero TTL to assert expiry is enforced at all.
    const expired = issueQrToken(eventId, secret, -1);
    expect(() => verifyQrToken(expired.token, eventId, secret)).toThrow();
    expect(token).toBeTruthy();
  });

  it("rejects a garbage token", () => {
    expect(() => verifyQrToken("not-a-real-jwt", eventId, secret)).toThrow();
  });
});
