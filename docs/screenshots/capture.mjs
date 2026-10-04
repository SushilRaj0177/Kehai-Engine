// Generates the README screenshots from a running local stack with the seed
// data (README "Local setup"): English into docs/screenshots, the Japanese
// UI into docs/screenshots/ja. Needs Playwright, jsQR and pngjs installed
// where Node can find them, e.g.  npm i --no-save playwright jsqr pngjs
//
//   WEB=http://localhost:3000 API=http://localhost:4000 node docs/screenshots/capture.mjs
//
// The installed-app shots emulate a phone opened from the home screen
// (standalone). The check-in shot does what a phone would: it decodes the
// teacher's live QR and opens the link inside it as an enrolled student.
// A student can only check in once per session, so re-seed a fresh database
// (prisma migrate reset) before capturing again.
import { chromium, devices } from "playwright";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = process.env.WEB ?? "http://localhost:3000";
const API = process.env.API ?? "http://localhost:4000";
const HERE = process.env.OUT_DIR ?? dirname(fileURLToPath(import.meta.url));
const ONLY = process.env.ONLY?.split(",");
const ROOM = { latitude: 12.8236, longitude: 80.0449, accuracy: 12 };

async function api(path, { token, method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
const login = (email) => api("/api/auth/login", { method: "POST", body: { email, password: "Password123!" } });

const teacher = await login("organizer@kehai.dev");
// Enrolled students who haven't checked in to today's session yet (one per language).
const students = { en: await login("divya.menon@students.kehai.dev"), ja: await login("aditya.kumar@students.kehai.dev") };
const orgs = await api("/api/orgs", { token: teacher.accessToken });
const org = orgs.find((o) => o.slug === "srm-nscc") ?? orgs[0];
const events = await api(`/api/orgs/${org.id}/events`, { token: teacher.accessToken });
const pastEvent = events.find((e) => e.name.startsWith("Intro to Systems Design")) ?? events[0];
const [classroom] = await api("/api/classrooms/mine", { token: teacher.accessToken });
const detail = await api(`/api/classrooms/${classroom.id}`, { token: teacher.accessToken });

async function checkinLink() {
  const { dataUrl } = await api(`/api/classrooms/${classroom.id}/sessions/${detail.openSession.id}/qr`, { token: teacher.accessToken });
  const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  const url = new URL(decoded.data);
  return url.pathname + url.search;
}

const browser = await chromium.launch();

async function shot(lang, name, { session, phone = false, standalone = false, scheme = "dark", path, prepare, geolocation = false, fullPage = false }) {
  if (ONLY && !ONLY.includes(name)) return;
  const ctx = await browser.newContext({
    ...(phone ? devices["Pixel 7"] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 }),
    colorScheme: scheme,
    locale: lang === "ja" ? "ja-JP" : "en-US",
    timezoneId: "Asia/Kolkata",
    reducedMotion: "reduce",
    ...(geolocation ? { geolocation: { latitude: ROOM.latitude + 0.00012, longitude: ROOM.longitude + 0.00004, accuracy: 12 }, permissions: ["geolocation"] } : {}),
  });
  await ctx.addInitScript(
    ([lang, session, standalone]) => {
      localStorage.setItem("kehai.locale", lang);
      if (session) localStorage.setItem("kehai.session", JSON.stringify(session));
      if (standalone) Object.defineProperty(navigator, "standalone", { configurable: true, get: () => true });
    },
    [lang, session ? { accessToken: session.accessToken, refreshToken: session.refreshToken } : null, standalone],
  );
  const page = await ctx.newPage();
  await page.goto(WEB + (typeof path === "function" ? await path() : path));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  if (prepare) await prepare(page);
  const out = join(HERE, lang === "ja" ? "ja" : "", `${name}.png`);
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage });
  console.log("wrote", out);
  await ctx.close();
}

for (const lang of ["en", "ja"]) {
  // Website (browser tab, desktop)
  await shot(lang, "landing", { path: "/" });
  await shot(lang, "org-console", { session: teacher, path: `/orgs/${org.slug}` });
  await shot(lang, "event-analytics", { session: teacher, path: `/orgs/${org.slug}/events/${pastEvent.id}` });
  await shot(lang, "classroom", { session: teacher, path: `/classrooms/${classroom.id}` });
  // Installed app (phone, opened from the home screen)
  await shot(lang, "app-home", { session: teacher, phone: true, standalone: true, path: "/home" });
  await shot(lang, "app-control-room", { session: teacher, phone: true, standalone: true, path: `/classrooms/${classroom.id}/live` });
  await shot(lang, "app-control-room-light", { session: teacher, phone: true, standalone: true, scheme: "light", path: `/classrooms/${classroom.id}/live` });
  await shot(lang, "app-checkin", {
    session: students[lang], phone: true, standalone: true, geolocation: true,
    path: checkinLink,
    prepare: async (page) => {
      // Walk the real flow: QR verified → share location → confirm → done.
      await page.getByRole("button", { name: /Share my location|位置情報を共有/ }).click({ timeout: 20000 });
      await page.getByRole("button", { name: /Confirm attendance|出席を確定/ }).click({ timeout: 20000 });
      await page.getByText(/Attendance confirmed|出席が確認されました/).waitFor({ timeout: 20000 });
      await page.waitForTimeout(1200);
    },
  });
}
await browser.close();
