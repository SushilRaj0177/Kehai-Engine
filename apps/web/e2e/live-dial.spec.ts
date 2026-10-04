import { expect, test, type Page } from "@playwright/test";
import { DIAL } from "../lib/liveDial";
import { MOCK_API } from "../playwright.config";

// The control room's live dial: the count readout must sit centred in the
// dial with nothing drawn across it, in both languages and themes, for
// small and large classes alike.

const CLASSROOM = "c-layout-test";
const SESSION = "s-layout-test";
// A 1x1 PNG is enough for the QR box.
const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function studentId(i: number) {
  // cuid-like ids; the spread covers hashes with the high bit set.
  let s = "c";
  let x = (i + 1) * 2654435761;
  for (let j = 0; j < 24; j++) {
    x = (x * 1103515245 + 12345) >>> 0;
    s += "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36];
  }
  return s;
}

async function mockApi(page: Page, present: number, enrolled: number) {
  const now = Date.now();
  const roster = Array.from({ length: Math.max(present, enrolled) }, (_, i) => ({
    student: { id: studentId(i), name: `Student ${i + 1}`, email: `s${i}@example.test` },
    enrolledAt: new Date(now - 864e5 * 30).toISOString(),
    gradeYear: null,
    presentDays: 10,
    totalDays: 12,
    attendanceRate: 0.83,
    lastAttendedAt: i < present ? new Date(now - i * 30_000).toISOString() : null,
    checkedInOpenSession: i < present,
  }));
  const body: Record<string, unknown> = {
    "/api/auth/me": { user: { id: "t1", email: "teacher@example.test", name: "Aiko" }, memberships: [] },
    [`/api/classrooms/${CLASSROOM}`]: {
      id: CLASSROOM,
      name: "Data Structures & Algorithms",
      courseCode: "CS201",
      semesterLabel: "Spring 2027",
      hasGeofence: true,
      geofenceRadiusM: 80,
      createdAt: new Date(now - 864e5 * 60).toISOString(),
      isTeacher: true,
      isEnrolled: false,
      joinCode: "ABC123",
      studentCount: enrolled,
      openSession: { id: SESSION, label: null, date: new Date(now).toISOString(), status: "OPEN" },
    },
    [`/api/classrooms/${CLASSROOM}/sessions`]: [
      { id: SESSION, label: null, date: new Date(now).toISOString(), status: "OPEN", qrRotationSeconds: 20, openedAt: new Date(now - 480_000).toISOString(), closedAt: null, presentCount: present },
    ],
    [`/api/classrooms/${CLASSROOM}/roster`]: roster,
    [`/api/classrooms/${CLASSROOM}/sessions/${SESSION}/qr`]: { dataUrl: PNG_1PX, expiresAt: new Date(now + 20_000).toISOString(), rotationSeconds: 20, secondsRemaining: 15 },
  };
  await page.route(`${MOCK_API}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/socket.io")) return route.abort();
    if (path in body) return route.fulfill({ json: body[path] });
    return route.fulfill({ json: [] });
  });
}

async function openControlRoom(page: Page, locale: "en" | "ja") {
  await page.addInitScript((loc) => {
    Object.defineProperty(window.navigator, "standalone", { get: () => true });
    localStorage.setItem("kehai.locale", loc);
    localStorage.setItem("kehai.session", JSON.stringify({ accessToken: "test", refreshToken: "test" }));
  }, locale);
  await page.goto(`/classrooms/${CLASSROOM}/live`);
  await page.locator(".pwa-radar .pwa-count strong").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Let the check-in ripple finish so only resting geometry is measured.
  await page.waitForTimeout(1800);
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface Measured {
  centre: { x: number; y: number };
  /** Ink bounds of each readout line (number, label, "of N"), in page px. */
  ink: { name: string; box: Box }[];
  dots: { x: number; y: number; r: number }[];
  guides: number[];
  crosshairEnds: number[];
}

// Where the pixels of each readout line actually land. Font boxes include
// ascent and descent padding, so they say little about what the eye sees:
// instead, screenshot the dial with one line visible at a time and diff it
// against a shot with the whole readout transparent.
async function inkBoxes(page: Page): Promise<{ name: string; box: Box }[]> {
  const radar = page.locator(".pwa-radar");
  const origin = (await radar.boundingBox())!;
  const lines = await page.locator(".pwa-radar .pwa-count > *").evaluateAll((els) => els.map((el) => el.tagName));
  const showOnly = (i: number) =>
    page.evaluate((only) => {
      document.querySelectorAll<HTMLElement>(".pwa-radar .pwa-count > *").forEach((el, j) => {
        el.style.color = j === only ? "" : "transparent";
      });
    }, i);
  const hideDial = (hide: boolean) =>
    page.evaluate((h) => {
      document.querySelectorAll<HTMLElement>(".pwa-radar > svg, .pwa-radar-sweep").forEach((el) => (el.style.visibility = h ? "hidden" : ""));
    }, hide);

  await hideDial(true);
  await showOnly(-1);
  const blank = (await radar.screenshot({ animations: "disabled" })).toString("base64");
  const out: { name: string; box: Box }[] = [];
  for (let i = 0; i < lines.length; i++) {
    await showOnly(i);
    const shot = (await radar.screenshot({ animations: "disabled" })).toString("base64");
    const box = await page.evaluate(
      async ([a, b]: readonly [string, string]) => {
        const load = async (b64: string) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const read = (img: ImageBitmap) => {
          const c = new OffscreenCanvas(img.width, img.height);
          const g = c.getContext("2d")!;
          g.drawImage(img, 0, 0);
          return g.getImageData(0, 0, img.width, img.height);
        };
        const da = read(ia);
        const db = read(ib);
        let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
        for (let y = 0; y < da.height; y++) {
          for (let x = 0; x < da.width; x++) {
            const k = (y * da.width + x) * 4;
            const diff = Math.abs(da.data[k] - db.data[k]) + Math.abs(da.data[k + 1] - db.data[k + 1]) + Math.abs(da.data[k + 2] - db.data[k + 2]);
            if (diff > 60) {
              left = Math.min(left, x);
              right = Math.max(right, x + 1);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y + 1);
            }
          }
        }
        return { left, right, top, bottom };
      },
      [blank, shot] as const
    );
    // Screenshots are in device pixels; convert back to page px.
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    out.push({
      name: lines[i],
      box: { left: origin.x + box.left / dpr, right: origin.x + box.right / dpr, top: origin.y + box.top / dpr, bottom: origin.y + box.bottom / dpr },
    });
  }
  await page.evaluate(() => document.querySelectorAll<HTMLElement>(".pwa-radar .pwa-count > *").forEach((el) => (el.style.color = "")));
  await hideDial(false);
  return out;
}

// Pixels inside the readout's clear disc that change when the dial's
// drawing (SVG + sweep) is shown: any ring, dot, mark or leftover effect
// over the count shows up here, whatever element draws it.
async function strayPixelsInClearDisc(page: Page): Promise<number> {
  const radar = page.locator(".pwa-radar");
  const set = (readout: boolean, dial: boolean) =>
    page.evaluate(
      ([r, d]) => {
        document.querySelectorAll<HTMLElement>(".pwa-radar .pwa-count > *").forEach((el) => (el.style.color = r ? "" : "transparent"));
        document.querySelectorAll<HTMLElement>(".pwa-radar > svg, .pwa-radar-sweep").forEach((el) => (el.style.visibility = d ? "" : "hidden"));
      },
      [readout, dial] as const
    );
  await set(false, false);
  const bare = (await radar.screenshot({ animations: "disabled" })).toString("base64");
  await set(false, true);
  const drawn = (await radar.screenshot({ animations: "disabled" })).toString("base64");
  await set(true, true);
  return page.evaluate(
    async ([a, b, clearR]) => {
      const load = async (b64: string) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const read = (img: ImageBitmap) => {
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext("2d")!;
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, img.width, img.height);
      };
      const [da, db] = (await Promise.all([load(a), load(b)])).map(read);
      const scale = da.width / 200;
      const cx = da.width / 2;
      const cy = da.height / 2;
      const limit = (clearR - 1) * scale;
      let stray = 0;
      for (let y = 0; y < da.height; y++) {
        for (let x = 0; x < da.width; x++) {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > limit) continue;
          const k = (y * da.width + x) * 4;
          const diff = Math.abs(da.data[k] - db.data[k]) + Math.abs(da.data[k + 1] - db.data[k + 1]) + Math.abs(da.data[k + 2] - db.data[k + 2]);
          if (diff > 60) stray++;
        }
      }
      return stray;
    },
    [bare, drawn, DIAL.clearR] as const
  );
}

async function measure(page: Page): Promise<Measured> {
  const ink = await inkBoxes(page);
  const geo = await page.evaluate(() => {
    const radar = document.querySelector(".pwa-radar")!;
    const svg = radar.querySelector("svg")!;
    const box = radar.getBoundingClientRect();
    const scale = box.width / 200;
    const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const pt = (x: number, y: number) => ({ x: box.left + x * scale, y: box.top + y * scale });
    const dots = Array.from(svg.querySelectorAll("circle.pwa-dot")).map((c) => {
      const p = pt(+c.getAttribute("cx")!, +c.getAttribute("cy")!);
      return { ...p, r: +c.getAttribute("r")! * scale };
    });
    const guides = Array.from(svg.querySelectorAll("circle.pwa-radar-guide")).map((c) => +c.getAttribute("r")! * scale);
    const crosshairEnds = Array.from(svg.querySelectorAll("line.pwa-crosshair")).flatMap((l) =>
      [["x1", "y1"], ["x2", "y2"]].map(([a, b]) => {
        const p = pt(+l.getAttribute(a)!, +l.getAttribute(b)!);
        return Math.hypot(p.x - centre.x, p.y - centre.y);
      })
    );
    return { centre, dots, guides, crosshairEnds };
  });
  return { ...geo, ink };
}

const CASES: { present: number; enrolled: number }[] = [
  { present: 0, enrolled: 12 },
  { present: 1, enrolled: 1 },
  { present: 7, enrolled: 12 },
  { present: 24, enrolled: 30 },
  { present: 99, enrolled: 120 },
  { present: 120, enrolled: 120 },
  { present: 3, enrolled: 0 },
];

for (const locale of ["en", "ja"] as const) {
  for (const scheme of ["dark", "light"] as const) {
    for (const motion of ["no-preference", "reduce"] as const) {
      for (const { present, enrolled } of CASES) {
        test(`dial readout is centred and unobstructed (${locale}, ${scheme}, ${motion} motion, ${present}/${enrolled})`, async ({ page }) => {
          await page.emulateMedia({ colorScheme: scheme, reducedMotion: motion });
          await mockApi(page, present, enrolled);
          await openControlRoom(page, locale);
          await expect(page.locator(".pwa-radar .pwa-count strong")).toHaveText(String(present));

          const m = await measure(page);
          if (process.env.DIAL_DEBUG) console.log(JSON.stringify(m.ink), JSON.stringify(m.centre));
          const clear = DIAL.clearR;

          // Every line of the readout has ink, inside the clear disc.
          for (const { name, box } of m.ink) {
            expect(Number.isFinite(box.left), `${name} drew nothing`).toBe(true);
            for (const [x, y] of [[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]]) {
              expect(Math.hypot(x - m.centre.x, y - m.centre.y), `${name} ink outside the clear disc`).toBeLessThanOrEqual(clear);
            }
          }
          // Lines stack top to bottom without touching.
          for (let i = 1; i < m.ink.length; i++) {
            expect(m.ink[i].box.top - m.ink[i - 1].box.bottom, `${m.ink[i].name} touches the line above`).toBeGreaterThanOrEqual(2);
          }
          // The readout is centred on the dial, and each line on its axis.
          const top = Math.min(...m.ink.map((r) => r.box.top));
          const bottom = Math.max(...m.ink.map((r) => r.box.bottom));
          expect(Math.abs((top + bottom) / 2 - m.centre.y), "readout off-centre vertically").toBeLessThanOrEqual(2);
          for (const { name, box } of m.ink) {
            expect(Math.abs((box.left + box.right) / 2 - m.centre.x), `${name} off-centre horizontally`).toBeLessThanOrEqual(2.5);
          }

          // Nothing drawn on the dial reaches into the clear disc.
          for (const d of m.dots) expect(Math.hypot(d.x - m.centre.x, d.y - m.centre.y) - d.r, "dot inside the readout").toBeGreaterThan(clear);
          for (const g of m.guides) expect(g, "guide ring crosses the readout").toBeGreaterThan(clear);
          for (const e of m.crosshairEnds) expect(e, "crosshair crosses the readout").toBeGreaterThan(clear);
          expect(m.dots.length).toBe(Math.min(present, 24));
          expect(await strayPixelsInClearDisc(page), "something is drawn over the readout").toBe(0);
        });
      }
    }
  }
}
