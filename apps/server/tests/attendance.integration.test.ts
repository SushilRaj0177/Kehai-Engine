import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { checkIn } from "../src/services/attendance.service.js";
import { issueQrToken } from "../src/utils/qrToken.js";
import { transitionEventStatus } from "../src/services/event.service.js";

/**
 * Integration tests against a real Postgres database (see DATABASE_URL in
 * .env) — these exercise the actual duplicate-prevention unique constraint
 * and geofence rejection path end-to-end, not just the pure math.
 */

const VENUE = { latitude: 12.8231, longitude: 80.0444 };

let orgId: string;
let userId: string;
let eventId: string;
let qrSecret: string;

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Test Org " + crypto.randomUUID(), slug: "test-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const user = await prisma.user.create({
    data: { name: "Test Attendee", email: `test-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  userId = user.id;

  qrSecret = crypto.randomBytes(16).toString("hex");
  const event = await prisma.event.create({
    data: {
      organizationId: orgId,
      createdById: user.id,
      name: "Integration Test Event",
      venue: "Test Venue",
      status: "ACTIVE",
      startsAt: new Date(Date.now() - 10 * 60_000),
      endsAt: new Date(Date.now() + 60 * 60_000),
      latitude: VENUE.latitude,
      longitude: VENUE.longitude,
      geofenceRadiusM: 100,
      qrSecret,
    },
  });
  eventId = event.id;
});

afterAll(async () => {
  await prisma.attendanceRecord.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

describe("attendance check-in", () => {
  it("succeeds when inside the geofence with a valid QR token", async () => {
    const { token } = issueQrToken(eventId, qrSecret, 30);
    const result = await checkIn({
      eventId,
      userId,
      qrToken: token,
      latitude: VENUE.latitude,
      longitude: VENUE.longitude,
      accuracyMeters: 10,
    });
    expect(result.distanceMeters).toBeLessThan(5);
  });

  it("rejects a duplicate check-in for the same user and event", async () => {
    const { token } = issueQrToken(eventId, qrSecret, 30);
    await expect(
      checkIn({
        eventId,
        userId,
        qrToken: token,
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
        accuracyMeters: 10,
      })
    ).rejects.toThrow(/already checked in/i);
  });

  it("rejects a check-in far outside the geofence", async () => {
    const otherUser = await prisma.user.create({
      data: { name: "Far Away", email: `far-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    const { token } = issueQrToken(eventId, qrSecret, 30);
    await expect(
      checkIn({
        eventId,
        userId: otherUser.id,
        qrToken: token,
        latitude: VENUE.latitude + 1, // ~111km away
        longitude: VENUE.longitude,
        accuracyMeters: 10,
      })
    ).rejects.toThrow(/from the venue/i);
    await prisma.user.delete({ where: { id: otherUser.id } });
  });

  it("rejects a QR token signed for a different event", async () => {
    const otherUser = await prisma.user.create({
      data: { name: "Wrong Event", email: `wrong-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    const bogusToken = issueQrToken("some-other-event-id", qrSecret, 30).token;
    await expect(
      checkIn({
        eventId,
        userId: otherUser.id,
        qrToken: bogusToken,
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
        accuracyMeters: 10,
      })
    ).rejects.toThrow(/invalid or has expired/i);
    await prisma.user.delete({ where: { id: otherUser.id } });
  });
});

describe("event lifecycle transitions", () => {
  it("allows PUBLISHED -> ACTIVE -> COMPLETED", async () => {
    const draft = await prisma.event.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "Lifecycle Event",
        venue: "Test Venue",
        status: "DRAFT",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600_000),
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
        qrSecret: crypto.randomBytes(16).toString("hex"),
      },
    });

    const published = await transitionEventStatus(draft.id, "PUBLISHED");
    expect(published.status).toBe("PUBLISHED");
    const active = await transitionEventStatus(draft.id, "ACTIVE");
    expect(active.status).toBe("ACTIVE");
    const completed = await transitionEventStatus(draft.id, "COMPLETED");
    expect(completed.status).toBe("COMPLETED");

    await prisma.event.delete({ where: { id: draft.id } });
  });

  it("rejects an invalid transition (DRAFT -> COMPLETED)", async () => {
    const draft = await prisma.event.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "Invalid Lifecycle Event",
        venue: "Test Venue",
        status: "DRAFT",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600_000),
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
        qrSecret: crypto.randomBytes(16).toString("hex"),
      },
    });

    await expect(transitionEventStatus(draft.id, "COMPLETED")).rejects.toThrow(/Cannot move event/);
    await prisma.event.delete({ where: { id: draft.id } });
  });
});
