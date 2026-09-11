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

describe("CSV export waitlist column", () => {
  it("marks a waitlisted registrant as Yes and a confirmed one as No", async () => {
    // Plain names with no embedded commas or quotes, so the row can be
    // split on "," directly without needing a real CSV parser — the
    // pre-existing formula-injection registrant's quoted, comma-containing
    // name would make naive splitting unreliable for that row.
    const waitlistedUser = await prisma.user.create({
      data: { name: "Waitlisted Exportee", email: `export-waitlisted-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    const confirmedUser = await prisma.user.create({
      data: { name: "Confirmed Exportee", email: `export-confirmed-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await prisma.registration.create({ data: { eventId, userId: waitlistedUser.id, waitlisted: true } });
    await prisma.registration.create({ data: { eventId, userId: confirmedUser.id, waitlisted: false } });

    const { content } = await exportAttendeesCsv(eventId);
    const lines = content.split("\n");
    const header = lines[0].split(",");
    const waitlistedCol = header.indexOf("Waitlisted");
    expect(waitlistedCol).toBeGreaterThan(-1);

    const waitlistedLine = lines.find((l) => l.includes("Waitlisted Exportee"));
    const confirmedLine = lines.find((l) => l.includes("Confirmed Exportee"));
    expect(waitlistedLine?.split(",")[waitlistedCol]).toBe("Yes");
    expect(confirmedLine?.split(",")[waitlistedCol]).toBe("No");

    await prisma.registration.deleteMany({ where: { eventId, userId: { in: [waitlistedUser.id, confirmedUser.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [waitlistedUser.id, confirmedUser.id] } } });
  });
});
