import crypto from "node:crypto";

/**
 * A rotating QR is a pure function of time: rotation windows are counted
 * from a fixed epoch (Event/ClassSession.qrEpochAt), and every request that
 * falls inside the same window gets the byte-identical token. Reloading the
 * page, switching language, reopening the app or opening a second display
 * no longer mints a new code or restarts the countdown -- only the window
 * boundary does.
 */
export interface QrWindow {
  index: number;
  startsAt: Date;
  rotatesAt: Date;
  secondsRemaining: number;
}

export function currentQrWindow(epoch: Date, rotationSeconds: number, now: Date = new Date()): QrWindow {
  const periodMs = Math.max(1, rotationSeconds) * 1000;
  const elapsed = Math.max(0, now.getTime() - epoch.getTime());
  const index = Math.floor(elapsed / periodMs);
  const startsAt = new Date(epoch.getTime() + index * periodMs);
  const rotatesAt = new Date(startsAt.getTime() + periodMs);
  const secondsRemaining = Math.max(1, Math.ceil((rotatesAt.getTime() - now.getTime()) / 1000));
  return { index, startsAt, rotatesAt, secondsRemaining };
}

/** Deterministic per-window token id (stable across requests, unguessable without the secret). */
export function windowJti(secret: string, index: number): string {
  return crypto.createHmac("sha256", secret).update(`qr-window:${index}`).digest("base64url").slice(0, 21);
}

/** How long a token stays valid past its window: one extra window (min 15s), same as before. */
export function graceSeconds(rotationSeconds: number): number {
  return Math.max(rotationSeconds, 15);
}
