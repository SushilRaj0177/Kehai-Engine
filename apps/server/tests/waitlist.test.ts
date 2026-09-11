import { afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import {
  createEvent,
  registerForEvent,
  removeRegistration,
  cancelMyRegistration,
  updateEvent,
} from "../src/services/event.service.js";

let orgId: string;
let organizerId: string;
let eventId: string;
let userIds: string[] = [];

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: { name: label, email: `waitlist-${label}-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  userIds.push(user.id);
  return user;
}

beforeEach(async () => {
  const org = await prisma.organization.create({
    data: { name: "Waitlist Test Org " + crypto.randomUUID(), slug: "waitlist-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const organizer = await prisma.user.create({
    data: { name: "Waitlist Organizer", email: `waitlist-organizer-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  organizerId = organizer.id;
  await prisma.membership.create({ data: { organizationId: orgId, userId: organizerId, role: "OWNER" } });

  const event = await createEvent(orgId, organizerId, {
    name: "Capacity-Limited Event",
    venue: "Test Venue",
    startsAt: new Date(Date.now() + 60 * 60_000),
    endsAt: new Date(Date.now() + 2 * 60 * 60_000),
    attendanceOpensMinutesBefore: 30,
    attendanceClosesMinutesAfter: 30,
    latitude: 0,
    longitude: 0,
    geofenceRadiusM: 100,
    qrRotationSeconds: 20,
    capacity: 2,
  } as any);
  eventId = event.id;
  await prisma.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });
});

afterEach(async () => {
  await prisma.attendanceRecord.deleteMany({ where: { eventId } });
  await prisma.registration.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.membership.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: [organizerId, ...userIds] } } });
  userIds = [];
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("event waitlist", () => {
  it("waitlists a registration once capacity is full instead of rejecting it", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");

    const regA = await registerForEvent(eventId, a.id);
    const regB = await registerForEvent(eventId, b.id);
    const regC = await registerForEvent(eventId, c.id);

    expect(regA.waitlisted).toBe(false);
    expect(regB.waitlisted).toBe(false);
    expect(regC.waitlisted).toBe(true);
  });

  it("promotes the oldest waitlisted registration when a confirmed one is removed", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");

    await registerForEvent(eventId, a.id);
    await registerForEvent(eventId, b.id);
    await registerForEvent(eventId, c.id);

    await removeRegistration(eventId, a.id);

    const promoted = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: c.id } },
    });
    expect(promoted?.waitlisted).toBe(false);
  });

  it("does not promote anyone when a waitlisted registration is removed (no spot freed)", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");
    const d = await makeUser("d");

    await registerForEvent(eventId, a.id);
    await registerForEvent(eventId, b.id);
    await registerForEvent(eventId, c.id);
    await registerForEvent(eventId, d.id);

    await removeRegistration(eventId, c.id); // waitlisted — removing it frees nothing

    const stillWaitlisted = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: d.id } },
    });
    expect(stillWaitlisted?.waitlisted).toBe(true);
  });

  it("promotes from the waitlist when an organizer raises capacity", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");

    await registerForEvent(eventId, a.id);
    await registerForEvent(eventId, b.id);
    await registerForEvent(eventId, c.id);

    await updateEvent(eventId, { capacity: 3 });

    const promoted = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: c.id } },
    });
    expect(promoted?.waitlisted).toBe(false);
  });

  it("promotes everyone waitlisted when an organizer removes the capacity limit", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");
    const d = await makeUser("d");

    await registerForEvent(eventId, a.id);
    await registerForEvent(eventId, b.id);
    await registerForEvent(eventId, c.id);
    await registerForEvent(eventId, d.id);

    await updateEvent(eventId, { capacity: null });

    const registrations = await prisma.registration.findMany({ where: { eventId } });
    expect(registrations.every((r) => !r.waitlisted)).toBe(true);
  });

  it("lets a waitlisted registrant cancel their own registration, and promotion still respects FIFO order for the rest", async () => {
    const a = await makeUser("a");
    const b = await makeUser("b");
    const c = await makeUser("c");
    const d = await makeUser("d");

    await registerForEvent(eventId, a.id);
    await registerForEvent(eventId, b.id);
    await registerForEvent(eventId, c.id);
    await registerForEvent(eventId, d.id);

    // c cancels their own waitlisted spot — doesn't free capacity, d stays waitlisted.
    await cancelMyRegistration(eventId, c.id);
    let dRow = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId: d.id } } });
    expect(dRow?.waitlisted).toBe(true);

    // a cancels their confirmed spot — frees capacity, d (next oldest waitlisted) is promoted.
    await cancelMyRegistration(eventId, a.id);
    dRow = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId: d.id } } });
    expect(dRow?.waitlisted).toBe(false);
  });
});
