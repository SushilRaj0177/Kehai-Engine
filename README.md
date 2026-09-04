# Kehai Engine (気配)

**気配** (*kehai*) — a sign that someone is present, a felt presence before
it's seen. That's the core idea: attendance you can actually verify, not
just a checkbox someone clicked.

Kehai Engine is a geospatially-verified, QR-based attendance and event
intelligence platform. It started as a response to SRM NSCC's technical
recruitment task ("QR-Based Geo-Tagged Attendance Management System") and
was built out substantially past that brief into a multi-tenant platform
with real-time dashboards, deterministic analytics, rule-based anomaly
detection, and an AI layer that interprets — rather than fabricates —
event data.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Authentication & authorization](#authentication--authorization)
- [QR security](#qr-security)
- [Geofence verification](#geofence-verification)
- [Realtime](#realtime)
- [Analytics & AI architecture](#analytics--ai-architecture)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [API overview](#api-overview)
- [Design decisions](#design-decisions)
- [Limitations](#limitations)
- [Roadmap](#roadmap)

---

## What it does

**Organizer side**
- Create an organization, invite teammates with roles (Owner/Admin/Organizer/Viewer)
- Create events with a draft → published → active → completed/cancelled lifecycle
- Set venue coordinates, a configurable geofence radius, capacity, and registration/attendance windows
- Display a rotating, signed check-in QR code
- Watch attendance happen live — no refresh needed
- Search/filter attendees, manually override a check-in when needed
- Export attendee lists as CSV or Excel
- See deterministic analytics (attendance rate, no-show rate, arrival timeline, peak arrival window) and rule-based anomaly flags
- Generate AI-interpreted insights, an AI post-event report, and ask natural-language questions about their org's event history

**Attendee side**
- Browse published/active events
- Register
- Scan the organizer's QR (in-app camera scanner or by opening the code's deep link directly)
- Share location once, see an honest distance readout, and get a confirmed/rejected check-in with a real reason

---

## Architecture

```
Kehai-Engine/
├── apps/
│   ├── server/            Node.js + TypeScript + Express + Prisma + PostgreSQL
│   │   ├── prisma/        Schema, migrations, seed script
│   │   ├── src/
│   │   │   ├── ai/        Provider abstraction, context builder, insights, NL query router
│   │   │   ├── config/    Zod-validated environment config
│   │   │   ├── middleware/ Auth, error handling, rate limiting
│   │   │   ├── realtime/  Socket.io server
│   │   │   ├── routes/    Express routers (one per resource)
│   │   │   ├── services/  Business logic (auth, event, attendance, analytics, anomaly, export, org)
│   │   │   ├── utils/     Geofence math, QR token signing, JWT helpers
│   │   │   └── validators/ Zod request schemas
│   │   └── tests/         Vitest — unit + integration (real Postgres)
│   └── web/                Next.js 14 (App Router) + TypeScript + Tailwind
│       ├── app/            Pages (landing, auth, organizer console, attendee flow)
│       ├── components/     UI kit + feature components (QR scanner, live QR panel, charts, AI panels)
│       └── lib/             API client, auth context, realtime client, hooks, types
├── docker-compose.yml
└── PRIVACY.md
```

**Why this stack:** Postgres + Prisma gives real relational integrity and
migrations without vendor lock-in (the brief explicitly ruled out Supabase/
Firebase). Express is deliberately boring and easy to audit for a
security-sensitive backend. Socket.io degrades gracefully when
websockets are blocked. Next.js App Router gives file-based routing for
three fairly distinct experiences (landing/marketing, organizer console,
attendee flow) without a separate router library. No PostGIS — at this
event-attendance scale, Haversine distance in the application layer is
simpler to reason about, test, and deploy anywhere, and the schema can
grow into PostGIS later if geospatial querying (not just point-to-point
distance) becomes a real need.

---

## Data model

Organization → Membership → Event → Registration/AttendanceRecord, plus a
lightweight AuditLog and an AI insight cache. See
`apps/server/prisma/schema.prisma` for the full annotated schema. Highlights:

- `Event.qrSecret` is per-event and combined with a global pepper — a leaked
  token for one event can't be replayed against another.
- `AttendanceRecord` has a unique constraint on `(eventId, userId)` —
  duplicate check-ins are prevented at the database level, not just in
  application logic.
- Coordinates on `AttendanceRecord` are rounded to 5 decimal places
  (~1.1m) before storage — see `PRIVACY.md`.

---

## Authentication & authorization

- **JWT access + refresh tokens.** Access tokens are short-lived (15m
  default); refresh tokens are stored hashed (`RefreshToken.tokenHash`,
  SHA-256) and revocable.
- **Google OAuth 2.0** via `google-auth-library`, verifying the ID token
  server-side. Optional — the platform works fully with password auth if
  `GOOGLE_CLIENT_ID` is unset.
- **Role-based authorization, enforced server-side on every request.**
  `requireOrgRole(minRole)` middleware re-reads the caller's `Membership`
  row from the database on every call — it never trusts a role embedded in
  a client-supplied token. Roles: `VIEWER < ORGANIZER < ADMIN < OWNER`.

---

## QR security

QR tokens are short-lived, signed JWTs (`apps/server/src/utils/qrToken.ts`),
not permanent identifiers:

- Each event has its own signing secret combined with a global pepper.
- The organizer's display re-requests a fresh token every
  `qrRotationSeconds` (default 20s) — a screenshot of the displayed code
  goes stale quickly.
- Revoking an event's QR (`qrRevoked`) instantly invalidates every
  outstanding token for it.
- Server-side validation checks the token's event binding, expiry, and
  signature on every check-in.

This is defense in depth around the real control — the geofence check — not
a claim of unforgeable proof-of-presence. A screenshotted QR sent to a
remote friend still has to pass geolocation verification to produce a valid
check-in.

---

## Geofence verification

`apps/server/src/utils/geo.ts` implements Haversine distance plus an
accuracy-aware tolerance: the effective radius is the configured geofence
radius **plus** the device's own reported GPS accuracy (capped at 150m), so
a phone standing just outside a hard-edged radius with legitimate ±40m
uncertainty isn't unfairly rejected. Invalid coordinates (out of range,
`(0,0)` "null island") are rejected outright. The attendee UI shows the
actual distance and confidence level, not just pass/fail — see
`app/attend/[eventId]/page.tsx`.

---

## Realtime

Socket.io (`apps/server/src/realtime/socket.ts`) emits `attendance:update`
to an event-scoped room on every check-in — attendee count, rate, and
recent activity update on the organizer dashboard without a refresh. The
web client (`lib/realtime.ts`) falls back to the existing SWR polling
(8-10s intervals) if the socket never connects, so the dashboard stays
functional behind a proxy that blocks websockets.

---

## Analytics & AI architecture

Four layers, deliberately kept separate:

1. **Deterministic analytics** (`services/analytics.service.ts`) — exact
   counts and rates computed directly from the database: attendance rate,
   no-show rate, arrival timeline buckets, peak arrival window, median
   check-in latency, recurring-attendee rate across an organization.
2. **Rule-based anomaly detection** (`services/anomaly.service.ts`) — plain
   statistical threshold checks (e.g. no-show rate ≥60%, attendance rate
   ≥20 points below the organization's recent average) with **zero** LLM
   involvement. Every flagged anomaly states exactly why, in code you can
   read.
3. **AI interpretation** (`ai/insights.service.ts`) — takes the Level 1/2
   output, sends it to Groq's API (free tier, no credit card required)
   through a structured tool-call
   (forcing valid JSON, not free text to parse), and asks it to explain
   what the numbers mean and suggest one concrete action. Results are
   cached per `(event, contentHash)` so unchanged data doesn't re-spend
   tokens, and a deterministic fallback summary is returned if no API key
   is configured or the call fails — **the dashboard never breaks because
   of the AI layer.**
4. **Natural-language interrogation** (`ai/nlQuery.service.ts`) — an
   organizer can ask "which event had the highest attendance rate?" The
   model **never** writes or executes a query. It only classifies the
   question into one of a small fixed set of intents (`org_overview`,
   `best_event`, `worst_no_show`, `compare_events`, …) via a forced
   structured tool call; the backend executes the matching deterministic
   Prisma function; the *exact* result is handed back to the model purely
   to phrase a readable sentence. This makes a hallucinated number or SQL
   injection structurally impossible — the model cannot produce a figure
   that didn't come from real computation.

**Data minimization:** the AI layer only ever receives already-aggregated
metrics (`ai/context.ts`) — never attendee names, emails, or raw
coordinates. See `PRIVACY.md`.

**Provider abstraction:** every AI call goes through
`ai/provider.ts` (`structuredCall` / `textCall`). Swapping or adding a
provider means changing one file.

---

## Local setup

Prerequisites: Node 22+, pnpm, PostgreSQL (or Docker).

```bash
pnpm install

# 1. Database
createdb kehai_engine   # or use docker-compose up postgres
cp apps/server/.env.example apps/server/.env
# edit apps/server/.env — set DATABASE_URL and generate secrets:
#   openssl rand -hex 32   (for JWT_ACCESS_SECRET / JWT_REFRESH_SECRET)
#   openssl rand -hex 16   (for QR_SIGNING_PEPPER)

pnpm --filter server prisma:migrate
pnpm --filter server db:seed   # creates a demo org, events, and attendees

# 2. Web
cp apps/web/.env.example apps/web/.env.local

# 3. Run both
pnpm dev:server   # http://localhost:4000
pnpm dev:web      # http://localhost:3000
```

Seeded demo login: `organizer@kehai.dev` / `Password123!`
(attendee accounts: `<first>.<last>@students.kehai.dev` / same password —
see `apps/server/prisma/seed.ts` for the full list).

---

## Environment variables

See `apps/server/.env.example` and `apps/web/.env.example` for the full,
commented list. Nothing is hardcoded — every URL and secret is
environment-driven. AI features (`GROQ_API_KEY` — free tier, no credit card
required, get one at console.groq.com/keys) and Google sign-in
(`GOOGLE_CLIENT_ID`) are both optional; the platform is fully functional
without them (password auth + deterministic analytics fallbacks).

---

## Testing

```bash
pnpm --filter server test
```

28 tests (Vitest): geofence math (including accuracy-padding edge cases and
invalid-coordinate rejection), QR token signing/verification (cross-event
rejection, expiry, tamper resistance), duplicate check-in prevention and
geofence rejection against a real Postgres database, event lifecycle
transition validity, and analytics correctness.

Frontend: `pnpm --filter web build` runs a full production build with
type-checking. The complete demo flow (register → org → event → publish →
activate → QR issue → register → check-in → duplicate rejection →
geofence rejection → analytics → CSV export) has been manually verified
end-to-end against a running server, and every organizer-console page has
been visually verified in a real browser.

---

## Deployment

`docker-compose.yml` builds and runs Postgres, the API, and the web app
locally. For a production target, point `WEB_ORIGIN` (server) and `API_URL`
(web, read at *container runtime* — see "Runtime API URL" below) at your
real domains, and run `prisma migrate deploy` (already wired into the
server's Docker `CMD`). Any standard container host (Fly.io, Railway,
Render, a VPS) works — there is no dependency on a specific platform's
proprietary services.

```bash
docker compose up --build
```

### Deploying to Render (free tier)

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that provisions all three pieces — Postgres, the API, and the web app — in
one pass:

1. Push this repo to your own GitHub account (fork or your own copy).
2. On [render.com](https://render.com): **New +** → **Blueprint** → connect
   the repo. Render reads `render.yaml` and shows a preview of the 3
   resources it'll create (`kehai-engine-db`, `kehai-engine-api`,
   `kehai-engine-web`) — click **Apply**.
3. Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `QR_SIGNING_PEPPER`)
   are auto-generated by Render, not committed to git.
4. Optional: open the `kehai-engine-api` service → **Environment** and set
   `GROQ_API_KEY` (enables AI features — free at console.groq.com/keys, no
   credit card) and/or `GOOGLE_CLIENT_ID` (enables Google sign-in). Both are
   left blank by default — the platform
   works fully without them.
5. First deploy takes a few minutes for both services to build. Once done,
   `kehai-engine-web`'s URL (`https://kehai-engine-web.onrender.com`, or
   check the dashboard if that name was taken) is what you share.

**Free-tier tradeoffs, stated plainly:** the free Postgres instance is
**deleted after 90 days** unless upgraded to a paid plan, and the free web
services **spin down after 15 minutes of inactivity** (the next visitor
waits ~30-50s for a cold start). This is a real limitation for a platform
where people are signing up and building attendance history — upgrading
`kehai-engine-db`'s plan in `render.yaml` (or directly in the dashboard)
from `free` to `starter` removes the 90-day expiry. A donation-funded
upgrade path (e.g. a Ko-fi link explaining exactly this tradeoff) is a
planned addition — see Roadmap.

### Runtime API URL (why this isn't a build arg)

Next.js normally bakes `NEXT_PUBLIC_*` variables into the JavaScript bundle
at **build time** — which would mean the API's URL has to be known before
the Docker image exists, awkward on platforms like Render where a service's
URL isn't fixed until you name it. Instead, `apps/web/app/layout.tsx` reads
a plain `API_URL` server-side environment variable **on every request**
(not build time) and passes it to `components/ApiBaseSetter.tsx`, a client
component that configures `lib/api.ts`'s in-memory API base before anything
else renders. The root layout is marked `export const dynamic =
"force-dynamic"` specifically so Next.js doesn't statically prerender pages
with the wrong (or missing) build-time value baked in. `NEXT_PUBLIC_API_URL`
still works as a local-dev convenience fallback (`next dev` doesn't have
this problem, since there's no separate build step).

---

## API overview

All routes are under `/api`. Representative endpoints:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/google`, `/refresh` | Auth |
| GET | `/api/auth/me` | Current user + memberships |
| POST | `/api/orgs` | Create organization |
| POST | `/api/orgs/:orgId/events` | Create event (role: ORGANIZER+) |
| POST | `/api/events/:eventId/status` | Lifecycle transition |
| GET | `/api/events/:eventId/qr` · `/api/qr/events/:eventId/qr-image` | Issue rotating check-in token / QR image |
| POST | `/api/events/:eventId/register` | Attendee registers |
| POST | `/api/attendance/:eventId/checkin` | QR + geofence verified check-in |
| GET | `/api/analytics/events/:eventId` | Deterministic metrics |
| GET | `/api/analytics/events/:eventId/anomalies` | Rule-based anomalies |
| GET | `/api/ai/events/:eventId/insights` · `/report` | AI-interpreted insights / report |
| POST | `/api/ai/orgs/:orgId/ask` | Natural-language query |
| GET | `/api/export/events/:eventId/attendees.csv` · `.xlsx` | Export |

---

## Design decisions

- **No PostGIS** — application-layer Haversine is enough for point-to-venue
  distance at this scale and keeps deployment simple; see Architecture.
- **Rotating QR over a static one** — the single highest-value security
  improvement over the baseline spec, implemented with standard JWT
  primitives rather than custom cryptography.
- **AI never computes numbers** — every architectural choice in the AI
  layer (structured tool calls, intent routing, aggregate-only context)
  exists to make hallucinated statistics structurally impossible, not just
  unlikely.
- **Graceful degradation everywhere** — AI, realtime, and Google auth are
  all optional; the platform is fully usable with none of them configured.

## Limitations

- Geofence verification trusts the browser Geolocation API's report; it is
  not a cryptographic proof of physical presence (a rooted device with a
  mocked GPS provider could still lie). See `PRIVACY.md` for the full,
  honest statement.
- Multi-language UI (English only today) — the data model and AI layer have
  no language assumptions baked in, so localization is additive, not a
  rewrite.
- No native mobile app — the attendee flow is a mobile-optimized web app
  using the browser's camera and geolocation APIs.

## Roadmap

- Recurring events / event series analytics
- Configurable per-organization anomaly thresholds
- Retention job to null out raw check-in coordinates after a configurable window (see PRIVACY.md)
- Bulk CSV import for pre-registering attendee lists
- Webhooks for organization-level integrations (Slack/Discord check-in pings)
- A "support this project" section in the UI explaining the free-tier
  Postgres 90-day expiry honestly, with a donation link (e.g. Ko-fi) framed
  as funding the upgrade to a paid database plan that doesn't expire
