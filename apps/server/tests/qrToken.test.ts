import { describe, expect, it } from "vitest";
import { issueQrToken, verifyQrToken } from "../src/utils/qrToken.js";
import { issueClassQrToken, verifyClassQrToken } from "../src/utils/classQrToken.js";
import { currentQrWindow } from "../src/utils/qrWindow.js";

describe("QR token signing", () => {
  const eventId = "evt_123";
  const secret = "event-specific-secret";
  const now = () => currentQrWindow(new Date(Date.now() - 5_000), 30);

  it("issues a token that verifies successfully for the correct event", () => {
    const { token, jti } = issueQrToken(eventId, secret, now(), 30);
    const payload = verifyQrToken(token, eventId, secret);
    expect(payload.jti).toBe(jti);
    expect(payload.eventId).toBe(eventId);
  });

  it("rejects a token when checked against a different event id", () => {
    const { token } = issueQrToken(eventId, secret, now(), 30);
    expect(() => verifyQrToken(token, "evt_other", secret)).toThrow();
  });

  it("rejects a token when checked against a different (e.g. rotated/regenerated) secret", () => {
    const { token } = issueQrToken(eventId, secret, now(), 30);
    expect(() => verifyQrToken(token, eventId, "wrong-secret")).toThrow();
  });

  it("returns the identical token for every request inside one window", () => {
    const epoch = new Date("2026-09-30T10:00:00Z");
    const a = issueQrToken(eventId, secret, currentQrWindow(epoch, 1800, new Date("2026-09-30T10:01:00Z")), 1800);
    const b = issueQrToken(eventId, secret, currentQrWindow(epoch, 1800, new Date("2026-09-30T10:29:59Z")), 1800);
    expect(a.token).toBe(b.token);
    expect(a.jti).toBe(b.jti);
  });

  it("rotates to a different token once the window boundary passes", () => {
    const epoch = new Date("2026-09-30T10:00:00Z");
    const a = issueQrToken(eventId, secret, currentQrWindow(epoch, 1800, new Date("2026-09-30T10:29:59Z")), 1800);
    const b = issueQrToken(eventId, secret, currentQrWindow(epoch, 1800, new Date("2026-09-30T10:30:00Z")), 1800);
    expect(a.token).not.toBe(b.token);
    expect(a.jti).not.toBe(b.jti);
  });

  it("reports time remaining in the current window, not a fresh full interval", () => {
    const epoch = new Date("2026-09-30T10:00:00Z");
    const w = currentQrWindow(epoch, 1800, new Date("2026-09-30T10:20:00Z"));
    expect(w.secondsRemaining).toBe(600);
    expect(w.rotatesAt.toISOString()).toBe("2026-09-30T10:30:00.000Z");
  });

  it("rejects a token whose window (plus grace) has long passed", () => {
    const old = currentQrWindow(new Date(Date.now() - 3_600_000), 30, new Date(Date.now() - 3_000_000));
    const { token } = issueQrToken(eventId, secret, old, 30);
    expect(() => verifyQrToken(token, eventId, secret)).toThrow();
  });

  it("rejects a garbage token", () => {
    expect(() => verifyQrToken("not-a-real-jwt", eventId, secret)).toThrow();
  });

  it("class session tokens are window-stable too", () => {
    const epoch = new Date(Date.now() - 10_000);
    const a = issueClassQrToken("ses_1", secret, currentQrWindow(epoch, 600), 600);
    const b = issueClassQrToken("ses_1", secret, currentQrWindow(epoch, 600), 600);
    expect(a.token).toBe(b.token);
    expect(verifyClassQrToken(a.token, "ses_1", secret).sessionId).toBe("ses_1");
  });
});
