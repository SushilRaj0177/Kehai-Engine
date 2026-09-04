# Privacy model

Kehai Engine processes identity, attendance, and location data. This document
states plainly what is collected, why, how long it's kept, and what it is
never used for.

## What is collected

| Data | Collected when | Purpose |
|---|---|---|
| Name, email, password hash | Registration | Account identity, login |
| Google account id/email/name/picture | Google sign-in | Alternative login, never stores the Google password |
| Organization membership + role | Joining/creating an org | Authorization |
| Event registration | Registering for an event | Capacity, no-show analysis |
| GPS coordinates (rounded to ~1.1m) + accuracy + distance from venue | Check-in only | Geofence verification, honest distance feedback |
| QR token `jti` consumed | Check-in only | Replay auditing, duplicate prevention |

## What is deliberately **not** collected

- Continuous or background location — the browser's Geolocation API is only
  invoked once, at the moment the attendee taps "share my location" during
  check-in. There is no location tracking outside that single request.
- Precise, uncoarsened coordinates are not needed and are rounded to 5
  decimal places (~1.1m) before storage — sufficient for a distance
  calculation, not for reconstructing someone's exact path.
- Device identifiers, IP-based tracking, or any fingerprinting.
- Raw attendee data is **never** sent to the AI provider — see
  "AI and data minimization" below.

## Retention

- **Attendance location snapshots** (lat/lng/accuracy/distance) are kept for
  the lifetime of the event record, because they are the auditable evidence
  behind an attendance decision (an organizer disputing "were they really
  there?" needs this). If you operate this platform for a real organization,
  we recommend a retention job that nulls out the raw coordinates (keeping
  only `distanceMeters` and `locationConfidence`) some fixed period after
  the event completes — this is a reasonable follow-up, documented here
  rather than silently promised as already built.
- **Refresh tokens** are revoked on logout and expire in 30 days.
- **AI insight cache** stores only aggregate, already-computed metrics
  (never raw attendee rows) and is invalidated whenever the underlying
  numbers change (content-hash keyed).

## AI and data minimization

The AI service layer (`apps/server/src/ai/`) only ever receives
**already-aggregated** analytics — attendance rate, arrival timeline
buckets, anomaly summaries. It never receives attendee names, emails, or
raw coordinates. See `apps/server/src/ai/context.ts` for the exact shape
sent to the model. This is a structural guarantee, not a policy promise:
the context object is built from `EventAnalytics`, which itself contains no
PII fields.

## Authorization boundaries

Every data-access endpoint re-checks the caller's `Membership` role against
the database on every request (`requireOrgRole` middleware) — role claims
are never trusted from a client-supplied token payload. Attendees can only
see their own registration/attendance status; organizers can only see
attendees for events in organizations they belong to at `ORGANIZER` role or
above.

## Known limitations (stated honestly)

- Geofence verification proves the *reported* device location was within
  range, widened for its own reported GPS accuracy. It is **not** a claim of
  spoof-proof presence — a rooted/jailbroken device with a mocked GPS
  provider can lie about its coordinates, same as with any consumer app
  relying on the browser Geolocation API. The rotating, per-event-signed QR
  token is defense in depth against the *simplest* attack (screenshotting a
  static code and sending it to someone remote), not a cryptographic
  location proof.
