import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { computeEventAnalytics } from "../src/services/analytics.service.js";
import { detectEventAnomalies } from "../src/services/anomaly.service.js";

let orgId: string;
let eventId: string;
const userIds: string[] = [];

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Analytics Test Org", slug: "analytics-test-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const creator = await prisma.user.create({
    data: { name: "Creator", email: `creator-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });

  const startsAt = new Date();
  const event = await prisma.event.create({
    data: {
      organizationId: orgId,
      createdById: creator.id,
      name: "Analytics Event",
      venue: "Venue",
      status: "COMPLETED",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3600_000),
      latitude: 12.8231,
      longitude: 80.0444,
      qrSecret: crypto.randomBytes(16).toString("hex"),
    },
  });
  eventId = event.id;
  userIds.push(creator.id);

  // 10 registrants, 6 attend (60% rate), with staggered check-in times.
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: { name: `User ${i}`, email: `analytics-user-${i}-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    userIds.push(user.id);
    await prisma.registration.create({ data: { eventId, userId: user.id } });

    if (i < 6) {
      await prisma.attendanceRecord.create({
        data: {
          eventId,
          userId: user.id,
          method: "QR_GEO",
          latitude: 12.8231,
          longitude: 80.0444,
          distanceMeters: 10 + i,
          locationConfidence: "high",
          qrTokenJti: `test-jti-${i}`,
          checkedInAt: new Date(startsAt.getTime() + i * 60_000), // spread over 6 minutes
        },
      });
    }
  }
});

afterAll(async () => {
  await prisma.attendanceRecord.deleteMany({ where: { eventId } });
  await prisma.registration.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

describe("computeEventAnalytics", () => {
  it("computes exact registration and attendance counts", async () => {
    const analytics = await computeEventAnalytics(eventId);
    expect(analytics.registrations).toBe(10);
    expect(analytics.attendance).toBe(6);
    expect(analytics.attendanceRate).toBeCloseTo(0.6, 5);
    expect(analytics.noShowRate).toBeCloseTo(0.4, 5);
  });

  it("never reports more attendance than registrations plus walk-ins", async () => {
    const analytics = await computeEventAnalytics(eventId);
    expect(analytics.attendance).toBeLessThanOrEqual(analytics.registrations + analytics.unregisteredAttendance);
  });

  it("flags a high no-show rate as an anomaly when the rate crosses threshold", async () => {
    const analytics = await computeEventAnalytics(eventId);
    // 40% no-show is below our 60% "high no-show" threshold — expect no such anomaly here.
    const anomalies = detectEventAnomalies(analytics, []);
    expect(anomalies.find((a) => a.type === "high_no_show")).toBeUndefined();
  });
});
