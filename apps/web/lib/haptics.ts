/**
 * Haptic feedback through the Vibration API (Android: Chrome, Samsung
 * Internet, Firefox). Browsers without it, including Safari on iPhone,
 * simply get no vibration. Every pattern is short and subtle: a buzz is
 * confirmation, never decoration.
 */

export const HAPTICS = {
  /** A finger pressed a button, link, tab, switch or list row. */
  tap: 8,
  /** The scanner read a QR code. */
  scan: [14, 40, 14],
  /** Check-in confirmed (or another important action worked). */
  success: [12, 70, 28],
  /** Something failed: check-in rejected, invalid code, network error. */
  error: [30, 60, 30, 60, 30],
} as const;

export type Haptic = keyof typeof HAPTICS;

/** Buzz once with the named pattern. Returns true if the device accepted it. */
export function haptic(kind: Haptic): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(HAPTICS[kind] as number | number[]);
  } catch {
    return false;
  }
}
