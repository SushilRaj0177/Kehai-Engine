import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { sendEventReminders } from "../src/services/reminder.service.js";

const VENUE = { latitude: 12.8231, longitude: 80.0444 };

let orgId: string;
let userId: string;
let soonEventId: string;
let farEventId: string;
let draftEventId: string;
let soonRegistrationId: string;

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Reminder Test Org " + crypto.randomUUID(), slug: "reminder-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const user = await prisma.user.create({
    data: { name: "Reminder Attendee", email: `reminder-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  userId = user.id;

  async function makeEvent(status: "PUBLISHED" | "DRAFT", startsAt: Date) {
    return prisma.event.create({
      data: {
        organizationId: orgId,
        createdById: user.id,
        name: "Reminder Test Event",
        venue: "Test Venue",
        status,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        latitude: VENUE.latitude,
        longitude: VENUE.longitude,
        geofenceRadiusM: 100,
        qrSecret: crypto.randomBytes(16).toString("hex"),
      },
    });
  }

  // Inside the 24h reminder window — should get emailed.
  const soonEvent = await makeEvent("PUBLISHED", new Date(Date.now() + 6 * 60 * 60_000));
  soonEventId = soonEvent.id;

  // Outside the window (a week out) — should NOT get emailed yet.
  const farEvent = await makeEvent("PUBLISHED", new Date(Date.now() + 7 * 24 * 60 * 60_000));
  farEventId = farEvent.id;

  // Inside the window but still a draft — should NOT get emailed.
  const draftEvent = await makeEvent("DRAFT", new Date(Date.now() + 6 * 60 * 60_000));
  draftEventId = draftEvent.id;

  const soonRegistration = await prisma.registration.create({ data: { eventId: soonEventId, userId } });
  soonRegistrationId = soonRegistration.id;
  await prisma.registration.create({ data: { eventId: farEventId, userId } });
  await prisma.registration.create({ data: { eventId: draftEventId, userId } });
});

afterAll(async () => {
  await prisma.registration.deleteMany({ where: { eventId: { in: [soonEventId, farEventId, draftEventId] } } });
  await prisma.event.deleteMany({ where: { id: { in: [soonEventId, farEventId, draftEventId] } } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

describe("event reminders", () => {
  it("emails only registrations for published events starting within the window, and marks them sent", async () => {
    const { sent } = await sendEventReminders();
    expect(sent).toBe(1);

    const soon = await prisma.registration.findUnique({ where: { id: soonRegistrationId } });
    expect(soon?.reminderSentAt).not.toBeNull();

    const far = await prisma.registration.findFirst({ where: { eventId: farEventId } });
    expect(far?.reminderSentAt).toBeNull();

    const draft = await prisma.registration.findFirst({ where: { eventId: draftEventId } });
    expect(draft?.reminderSentAt).toBeNull();
  });

  it("never re-sends to a registration already marked reminded", async () => {
    const { sent } = await sendEventReminders();
    expect(sent).toBe(0);
  });
});
