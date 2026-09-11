import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "../src/utils/unsubscribeToken.js";
import { sendEventReminders } from "../src/services/reminder.service.js";

describe("unsubscribe token", () => {
  it("round-trips a valid token back to the same userId", () => {
    const token = signUnsubscribeToken("user-123");
    expect(verifyUnsubscribeToken(token)).toBe("user-123");
  });

  it("rejects a tampered token", () => {
    const token = signUnsubscribeToken("user-123");
    const tampered = token.replace("user-123", "user-456");
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifyUnsubscribeToken("not-a-real-token")).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
  });
});

describe("event reminders respect the unsubscribe flag", () => {
  let orgId: string;
  let eventId: string;
  let userId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: "Unsub Test Org " + crypto.randomUUID(), slug: "unsub-org-" + crypto.randomUUID() },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        name: "Unsub Test User",
        email: `unsub-${crypto.randomUUID()}@example.com`,
        provider: "PASSWORD",
        emailNotificationsEnabled: false,
      },
    });
    userId = user.id;

    const event = await prisma.event.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: "Unsub Test Event",
        venue: "Test Venue",
        status: "PUBLISHED",
        startsAt: new Date(Date.now() + 6 * 60 * 60_000),
        endsAt: new Date(Date.now() + 7 * 60 * 60_000),
        latitude: 0,
        longitude: 0,
        geofenceRadiusM: 100,
        qrSecret: crypto.randomBytes(16).toString("hex"),
      },
    });
    eventId = event.id;

    await prisma.registration.create({ data: { eventId, userId } });
  });

  afterAll(async () => {
    await prisma.registration.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it("skips a registrant who has opted out of email notifications", async () => {
    const { sent } = await sendEventReminders();
    expect(sent).toBe(0);

    const registration = await prisma.registration.findFirst({ where: { eventId } });
    expect(registration?.reminderSentAt).toBeNull();
  });
});
