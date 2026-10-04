import { describe, expect, it } from "vitest";
import { DIAL, countFontSize, dotPosition } from "@/lib/liveDial";

const dist = (p: { x: number; y: number }) => Math.hypot(p.x - DIAL.c, p.y - DIAL.c);

// Ids shaped like the server's (cuid) plus arbitrary strings, so the hash
// covers its whole range, high bit set included.
function ids(n: number): string[] {
  const out: string[] = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < n; i++) {
    const len = 8 + Math.floor(rnd() * 20);
    let s = i % 2 ? "c" : "";
    for (let j = 0; j < len; j++) s += alphabet[Math.floor(rnd() * alphabet.length)];
    out.push(s);
  }
  return out;
}

describe("live dial geometry", () => {
  it("keeps the clear disc, rings and dot band in order, inside out", () => {
    for (const r of DIAL.guideRs) expect(r).toBeGreaterThan(DIAL.clearR);
    expect(DIAL.crosshair[0]).toBeGreaterThan(DIAL.clearR);
    expect(DIAL.dotMinR - DIAL.dotMaxSize).toBeGreaterThan(DIAL.clearR);
    expect(DIAL.dotMaxR + DIAL.dotMaxSize).toBeLessThan(DIAL.qrR);
    expect(DIAL.qrR).toBeLessThan(DIAL.arcR);
    expect(DIAL.arcR).toBeLessThan(DIAL.size / 2);
  });

  it("places every student dot in the band around the readout", () => {
    for (const id of ids(20000)) {
      const d = dist(dotPosition(id));
      expect(d).toBeGreaterThanOrEqual(DIAL.dotMinR - 1e-9);
      expect(d).toBeLessThanOrEqual(DIAL.dotMaxR + 1e-9);
    }
  });

  it("handles ids whose hash has the high bit set (the old signed-shift bug)", () => {
    const hash = (id: string) => {
      let h = 0;
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return h;
    };
    const high = ids(2000).filter((id) => hash(id) >= 2 ** 31);
    expect(high.length).toBeGreaterThan(100);
    for (const id of high) expect(dist(dotPosition(id))).toBeGreaterThan(DIAL.clearR + DIAL.dotMaxSize);
  });

  it("is stable for the same id", () => {
    for (const id of ids(50)) expect(dotPosition(id)).toEqual(dotPosition(id));
  });

  it("spreads dots around the whole dial", () => {
    const quadrants = new Set(ids(400).map((id) => {
      const p = dotPosition(id);
      return `${p.x > DIAL.c}${p.y > DIAL.c}`;
    }));
    expect(quadrants.size).toBe(4);
  });

  it("shrinks the count as it gains digits, so it fits the clear disc", () => {
    // The mono font's digits are ~0.6em wide and the glyph box ~1em tall.
    for (const n of [0, 7, 12, 99, 100, 999, 1000, 99999]) {
      const size = countFontSize(n);
      const halfW = (String(n).length * 0.6 * size) / 2;
      const halfH = size / 2;
      expect(Math.hypot(halfW, halfH)).toBeLessThan(DIAL.clearR);
    }
    expect(countFontSize(5)).toBeGreaterThanOrEqual(countFontSize(500));
    expect(countFontSize(500)).toBeGreaterThanOrEqual(countFontSize(5000));
  });
});
