// Geometry for the control room's live dial (PwaLiveSession). Kept apart
// from the component so the layout rules can be tested: the count readout
// sits in a clear centre disc, and nothing drawn on the dial -- guide rings,
// crosshair marks, student dots -- may enter it.
//
// Units are SVG user units on a 200 x 200 viewBox, which the dial renders
// at 1:1 CSS pixels.
export const DIAL = {
  size: 200,
  c: 100,
  /** Radius of the disc reserved for the readout (number + labels). */
  clearR: 56,
  /** Guide ring marking the edge of the clear disc, behind the dots. */
  guideRs: [58] as const,
  /** Crosshair marks run between these radii. */
  crosshair: [60, 70] as const,
  /** Student dot centres fall between these radii. */
  dotMinR: 61,
  dotMaxR: 69,
  /** Largest dot (the newest check-in). */
  dotMaxSize: 3.6,
  qrR: 74,
  arcR: 84,
  discR: 80,
} as const;

/** A stable angle and distance for a student, derived from their id.
 *  The hash is unsigned throughout: a signed shift here once sent about
 *  half the dots into the middle of the readout. */
export function dotPosition(id: string): { x: number; y: number } {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const angle = ((h % 360) * Math.PI) / 180;
  const span = DIAL.dotMaxR - DIAL.dotMinR;
  const radius = DIAL.dotMinR + ((h >>> 9) % (span + 1));
  return { x: DIAL.c + Math.cos(angle) * radius, y: DIAL.c + Math.sin(angle) * radius };
}

/** Font size for the count, so wider numbers still fit the clear disc. */
export function countFontSize(n: number): number {
  const digits = String(Math.max(0, Math.floor(n))).length;
  if (digits <= 2) return 44;
  if (digits === 3) return 34;
  return 26;
}
