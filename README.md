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
- [Trust & integrity](#trust--integrity)
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
- Export attendee lists as CSV or Excel (including waitlist status)
- Manually mark someone present, or undo a check-in that was a wrong scan or misclick
- Remove a registration, or run a capacity-aware waitlist that promotes the next person automatically when a spot opens
- Duplicate an event, delete one outright, or delete the whole organization
- Manage the team: invite by role, change an existing member's role inline, or remove them
- Review an organization-wide activity log of who did what
- Get a live ping in the club's own Discord or Slack the moment someone checks in (paste one incoming-webhook URL, no other setup)
- Every manual override or membership change is written to a tamper-evident, hash-chained audit log — see [Trust & integrity](#trust--integrity)
- See deterministic analytics (attendance rate, no-show rate, arrival timeline, peak arrival window) and rule-based anomaly flags
- Generate AI-interpreted insights, an AI post-event report, and ask natural-language questions about their org's event history

**Attendee side**
- Browse published/active events
- Register (or join a waitlist once an event is full, with automatic promotion when a spot opens)
- Verify their email address
- Scan the organizer's QR (in-app camera scanner or by opening the code's deep link directly)
- Share location once, see an honest distance readout, and get a confirmed/rejected check-in with a real reason
- Cancel a registration, or delete their own account (blocked while they'd strand an organization as its sole owner)

**Classrooms (teacher side)** — a second, parallel workflow for tracking a
class's attendance over a semester rather than a one-off event:
- Create a classroom and share a 6-character join code or link
- Start, name, end, and restart as many check-in sessions as needed — a
  lecture and a separate quiz on the same day are two independent sessions,
  each with its own QR and its own record
- Get notified in real time the moment a student joins
- Track both individual and whole-class attendance on a GitHub-contribution
  -style heatmap, with current/longest streaks
- Nudge an at-risk student by email — automatically (weekly, cooldown-gated)
  or manually on demand — and regenerate a classroom's join code, or delete
  the classroom itself
- Roster sorted by seniority (alumni/graduate first, descending by year,
  unset last) with each member's grade year (学年) editable inline
- Review a classroom-scoped activity log of every manual attendance override

**Classrooms (student side)**
- Join a class by typing its code, optionally noting a grade year
  (1st-4th year, graduate student, or alumni/OB·OG) on the way in
- Check in the same QR + geofence way as an event
- See their own attendance heatmap and streak for every class they're in
- Leave a classroom themselves, without needing the teacher to remove them

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
migrations without vendor lock-in (the brief explicitly ruled out building
on Supabase/Firebase's client SDKs and auto-generated APIs — the app still
talks to its own Express backend, not a BaaS. The production database
happens to be *hosted* on Supabase's free Postgres tier, but only as a
plain Postgres connection string Prisma connects to directly; nothing
Supabase-specific is used). Express is deliberately boring and easy to audit for a
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

- **JWT access + refresh tokens, persistent by design.** Access tokens are
  long-lived (7d default) and refresh tokens (stored hashed,
  `RefreshToken.tokenHash`, SHA-256) do **not** rotate on use — they slide
  their expiry forward on every refresh instead. A session ends only on
  explicit logout or a password reset (which revokes every refresh token
  for that user), matching a "stay signed in" expectation. Rotating on
  every refresh was tried first and abandoned: it meant any interrupted
  request (a page reload mid-refresh, two tabs refreshing near-
  simultaneously) could strand the client holding an already-invalidated
  token, forcing a spurious logout.
- **Forgot/reset password**, email-delivered via Resend
  (`RESEND_API_KEY` — optional, see Environment variables). A reset always
  revokes every existing session for that account.
- **Google OAuth 2.0** via `google-auth-library`, verifying the ID token
  server-side. Optional — the platform works fully with password auth if
  `GOOGLE_CLIENT_ID` is unset.
- **Role-based authorization, enforced server-side on every request.**
  `requireOrgRole(minRole)` middleware re-reads the caller's `Membership`
  row from the database on every call — it never trusts a role embedded in
  a client-supplied token. Roles: `VIEWER < ORGANIZER < ADMIN < OWNER`.
  Classrooms mirror this with `requireClassroomTeacher()`, re-checking
  `Classroom.teacherId` the same way.

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

## Trust & integrity

Whoever operates this app controls its database — that's true of any
attendance system anyone hosts, and no application code can make that
technically impossible. What the app does instead: every manual attendance
override, and every organization membership removal, is written through
`appendAuditLog()` (`apps/server/src/utils/auditLog.ts`) to an
append-only `AuditLog` table, and nothing in the codebase writes to that
table any other way.

Each row's `hash` is a SHA-256 of its own fields plus the *previous* row's
hash, forming a chain — editing or deleting a past row (including via
direct database access, not just the API) breaks every hash after it.
`verifyAuditLogChain()` re-walks the whole table and recomputes each hash
to confirm nothing's broken; it's exposed with no auth and no row content
at `GET /api/audit/verify`, and rendered live on the public
[`/trust`](apps/web/app/trust/page.tsx) page so anyone — a club, a
program coordinator, a skeptical student — can check the current state of
the chain themselves instead of taking it on faith. Metadata is hashed via
a recursively key-sorted stringifier specifically because Postgres JSONB
does not preserve object key order, which would otherwise produce false
"tampered" verdicts on rows nobody touched.

Organizations get an org-scoped audit log (`GET /api/orgs/:orgId/audit-log`,
ADMIN+); classrooms get the same for their manual overrides
(`GET /api/classrooms/:classroomId/audit-log`, teacher-only) — a program
can add its own coordinator as an admin/teacher and check the log
independently, rather than trusting an export.

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
required, get one at console.groq.com/keys), Google sign-in
(`GOOGLE_CLIENT_ID`), and password-reset email (`RESEND_API_KEY` — free
tier, no credit card required, get one at resend.com/api-keys) are all
optional; the platform is fully functional without any of them (password
auth still works, a reset request without an email key configured just
logs the link server-side instead of emailing it).

---

## Testing

```bash
pnpm --filter server test
```

148 tests across 22 files (Vitest): geofence math (including accuracy-padding
edge cases and invalid-coordinate rejection), QR token signing/verification
(cross-event rejection, expiry, tamper resistance) for both events and
classroom sessions, duplicate check-in prevention, geofence rejection, and
attendance revocation against a real Postgres database, event lifecycle
transition validity, join-code generation and regeneration, streak
computation, analytics correctness, waitlist promotion under a
transactional row lock, email verification token lifecycle, self-service
account/classroom deletion guards, organization role-change authorization
(an ADMIN can't touch an OWNER or a peer ADMIN's role), Discord/Slack
webhook delivery (never throws on a failed or unreachable endpoint, refuses
to deliver to a private/internal/metadata address) and URL validation, the
audit log's hash chain (unaffected by JSONB key reordering, catches a row
edited or deleted after the fact), and the auth session lifecycle (refresh
non-rotation, logout revocation, password reset revoking every session).

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

### Deploying (split hosting: Supabase + Render + Vercel)

The database runs on Supabase, the API runs on Render, and the Next.js
frontend runs on Vercel. Vercel is Next.js's own first-party host and
handles it with zero Docker involved, which sidesteps an entire class of
pnpm-workspace/Docker packaging issues a generic container host runs into
with a monorepo (we hit several getting the Render-only setup working; see
git history on `render.yaml` and both Dockerfiles for the specifics if
you're curious — pnpm's `exec` re-triggering a full reinstall when the
runtime image lacks its workspace root files was the big one).

**Why the database isn't on Render too:** it originally was, via a Render
Blueprint-provisioned Postgres instance. Render's free Postgres plan is
**deleted after 90 days** with no way to keep it alive short of upgrading
to a paid plan — a real problem for a platform meant to accumulate real
attendance history over a semester. Supabase's free Postgres tier doesn't
have that hard expiry (it pauses after a stretch of no activity and comes
back with one click in its dashboard, rather than being deleted outright).
Since Prisma just needs a plain Postgres connection string, moving
providers is a one-line `DATABASE_URL` change — no schema or code changes,
no vendor lock-in either way.

**1. Database on Supabase:**

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, click **Connect** (top of the dashboard) and copy the
   **Session pooler** connection string, not the "Direct connection" one —
   Supabase's direct-connection hostname resolves IPv6-only by default,
   which a number of hosts (including some CI/container environments)
   can't reach; the session pooler is IPv4-compatible and works
   everywhere. Fill in the database password you set when creating the
   project.
3. If that password contains any of `@ : / ? # &`, URL-encode just that
   character in the connection string (e.g. `@` → `%40`) — those characters
   are part of the URI syntax itself, and a literal one in the password
   breaks parsing.

**2. API on Render:**

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec)
that provisions the API service:

1. Push this repo to your own GitHub account (fork or your own copy).
2. On [render.com](https://render.com): **New +** → **Blueprint** → connect
   the repo. Render reads `render.yaml` and shows a preview
   (`kehai-engine-api`) — click **Apply**.
3. Open `kehai-engine-api` → **Environment** and set `DATABASE_URL` to the
   Supabase connection string from step 1. Secrets (`JWT_ACCESS_SECRET`,
   `JWT_REFRESH_SECRET`, `QR_SIGNING_PEPPER`) are auto-generated by Render,
   not committed to git.
4. Optional: also set `GROQ_API_KEY` (enables AI features — free at
   console.groq.com/keys, no credit card), `GOOGLE_CLIENT_ID` (enables
   Google sign-in), and `RESEND_API_KEY` (enables verification/reset
   emails — free at resend.com/api-keys). All three are left blank by
   default — the platform works fully without any of them.
5. Note the resulting API URL (e.g. `https://kehai-engine-api.onrender.com`)
   — you'll need it for step 3 below.

**3. Frontend on Vercel:**

1. On [vercel.com](https://vercel.com): **Add New** → **Project** → import
   the same repo.
2. Set **Root Directory** to `apps/web` (Vercel's monorepo support handles
   the pnpm workspace correctly from there — no extra config needed).
3. Add an environment variable: `API_URL` = the Render API URL from step 2.
4. Deploy. Vercel gives you a URL like `https://your-project.vercel.app` —
   that's what you share.
5. Go back to Render's `kehai-engine-api` → **Environment** and set
   `WEB_ORIGIN` to that Vercel URL (needed for CORS and the realtime
   socket connection to accept requests from it).

**Free-tier tradeoffs, stated plainly:** the free Render API service
**spins down after 15 minutes of inactivity** (the next request waits
~30-50s for a cold start) — worth knowing before promoting the link
somewhere people are opening it cold. Supabase's free Postgres pauses
(not deletes) after a stretch of total inactivity, and a database with
real, regularly-checked-in-to events won't hit that. Vercel's free tier
for the frontend has no equivalent sleep/expiry behavior. Several of
these platforms (Render, Supabase) offer free or discounted tiers for
student/education projects on request, worth checking before paying for
anything.

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
| POST | `/api/auth/forgot-password`, `/reset-password` | Password recovery (always 200, no account enumeration) |
| GET | `/api/auth/me` | Current user + memberships |
| POST | `/api/orgs` | Create organization |
| POST | `/api/orgs/:orgId/events` | Create event (role: ORGANIZER+) |
| POST | `/api/events/:eventId/status` | Lifecycle transition |
| GET | `/api/events/:eventId/qr` · `/api/qr/events/:eventId/qr-image` | Issue rotating check-in token / QR image |
| POST | `/api/events/:eventId/register` | Attendee registers (waitlists automatically once full) |
| DELETE | `/api/events/:eventId/registrations/:userId` | Cancel a registration (promotes the next waitlisted person) |
| POST | `/api/attendance/:eventId/checkin` | QR + geofence verified check-in |
| POST | `/api/attendance/:eventId/override` · DELETE `/attendees/:userId` | Manual present / undo a check-in |
| DELETE | `/api/orgs/:orgId` · `/api/classrooms/:id` | Delete an organization / classroom |
| PATCH | `/api/orgs/:orgId/webhook` | Set/clear the Discord or Slack check-in notification webhook (ADMIN+) |
| GET | `/api/analytics/events/:eventId` | Deterministic metrics |
| GET | `/api/analytics/events/:eventId/anomalies` | Rule-based anomalies |
| GET | `/api/ai/events/:eventId/insights` · `/report` | AI-interpreted insights / report |
| POST | `/api/ai/orgs/:orgId/ask` | Natural-language query |
| GET | `/api/export/events/:eventId/attendees.csv` · `.xlsx` | Export |
| POST | `/api/classrooms` · GET `/mine` · `/enrolled` | Create / list classrooms |
| POST | `/api/classrooms/join` | Join by 6-character code |
| GET/POST/PATCH | `/api/classrooms/:id/sessions[/:sessionId]` | List, start, rename, or re-rotate a session |
| POST | `/api/classrooms/:id/sessions/:sessionId/close` · `/reopen` | End or restart a session |
| GET | `/api/classrooms/:id/sessions/:sessionId/qr` | Issue that session's rotating QR image |
| POST | `/api/classrooms/:id/checkin` | QR + geofence verified check-in |
| GET | `/api/classrooms/:id/heatmap` · `/roster` | Attendance heatmap / per-student roster |

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
- Bilingual UI (English/Japanese) today — the i18n system
  (`apps/web/lib/i18n.tsx`) is a flat dictionary keyed by dot-path, so
  adding a third language is additive (one more locale column), not a
  rewrite. First-time visitors get Japanese automatically if their browser
  is set to it (`navigator.language`); anyone who explicitly switches has
  that choice remembered from then on.
- No native mobile app — the attendee flow is a mobile-optimized web app
  using the browser's camera and geolocation APIs.

## Roadmap

- Recurring events / event series analytics
- Configurable per-organization anomaly thresholds
- Retention job to null out raw check-in coordinates after a configurable window (see PRIVACY.md)
- Bulk CSV import for pre-registering attendee lists
- A "support this project" section in the UI explaining free-tier hosting
  tradeoffs honestly, with a donation link (e.g. Ko-fi) framed as funding
  a paid plan on whichever piece needs it as real usage grows
