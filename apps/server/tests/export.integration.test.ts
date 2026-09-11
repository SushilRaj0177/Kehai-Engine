import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { exportAttendeesCsv } from "../src/services/export.service.js";

let orgId: string;
let eventId: string;
let userId: string;

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Export Test Org " + crypto.randomUUID(), slug: "export-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  // A display name shaped like a spreadsheet formula — this is exactly the
  // CSV/formula-injection payload a malicious registrant could set as their
  // own account name before an organizer exports the attendee list.
  const user = await prisma.user.create({
    data: { name: "=HYPERLINK(\"http://evil.example\",\"click\")", email: `csv-injection-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  userId = user.id;

  const event = await prisma.event.create({
    data: {
      organizationId: orgId,
      createdById: user.id,
      name: "CSV Export Test Event",
      venue: "Test Venue",
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 60 * 60_000),
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

describe("CSV export formula injection guard", () => {
  it("neutralizes a display name shaped like a spreadsheet formula", async () => {
    const { content } = await exportAttendeesCsv(eventId);
    expect(content).not.toContain('"=HYPERLINK');
    expect(content).toContain("'=HYPERLINK");
  });
});
