import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createEvent, registerForEvent, removeRegistration, getEventForViewer } from "../src/services/event.service.js";
import { manualOverride } from "../src/services/attendance.service.js";

let orgId: string;
let organizerId: string;
let eventId: string;

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Remove Registration Test Org " + crypto.randomUUID(), slug: "remove-reg-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const organizer = await prisma.user.create({
    data: { name: "Registration Organizer", email: `reg-organizer-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  organizerId = organizer.id;
  await prisma.membership.create({ data: { organizationId: orgId, userId: organizerId, role: "OWNER" } });

  const event = await createEvent(orgId, organizerId, {
    name: "Removable Registration Event",
    venue: "Test Venue",
    startsAt: new Date(Date.now() + 60 * 60_000),
    endsAt: new Date(Date.now() + 2 * 60 * 60_000),
    attendanceOpensMinutesBefore: 30,
    attendanceClosesMinutesAfter: 30,
    latitude: 0,
    longitude: 0,
    geofenceRadiusM: 100,
    qrRotationSeconds: 20,
  } as any);
  eventId = event.id;
  await prisma.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" } });
});

afterAll(async () => {
  await prisma.attendanceRecord.deleteMany({ where: { eventId } });
  await prisma.registration.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.user.delete({ where: { id: organizerId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

describe("removing a registration from an event", () => {
  it("deletes the registration for someone who hasn't checked in", async () => {
    const attendee = await prisma.user.create({
      data: { name: "Leaving Attendee", email: `leaver-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });

    await registerForEvent(eventId, attendee.id);
    await removeRegistration(eventId, attendee.id);

    const registration = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: attendee.id } },
    });
    expect(registration).toBeNull();

    await prisma.user.delete({ where: { id: attendee.id } });
  });

  it("rejects removing a registration that doesn't exist", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Never Registered", email: `never-registered-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(removeRegistration(eventId, stranger.id)).rejects.toThrow(/doesn't exist/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });

  it("rejects removing a registration that has already checked in", async () => {
    const attendee = await prisma.user.create({
      data: { name: "Checked-In Attendee", email: `checked-in-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await registerForEvent(eventId, attendee.id);
    await manualOverride(eventId, attendee.id, organizerId);

    await expect(removeRegistration(eventId, attendee.id)).rejects.toThrow(/already checked in/i);

    await prisma.attendanceRecord.deleteMany({ where: { eventId, userId: attendee.id } });
    await prisma.registration.deleteMany({ where: { eventId, userId: attendee.id } });
    await prisma.user.delete({ where: { id: attendee.id } });
  });
});

describe("viewing a DRAFT event", () => {
  let draftEventId: string;

  beforeAll(async () => {
    const draft = await createEvent(orgId, organizerId, {
      name: "Unpublished Draft Event",
      venue: "Test Venue",
      startsAt: new Date(Date.now() + 60 * 60_000),
      endsAt: new Date(Date.now() + 2 * 60 * 60_000),
      attendanceOpensMinutesBefore: 30,
      attendanceClosesMinutesAfter: 30,
      latitude: 0,
      longitude: 0,
      geofenceRadiusM: 100,
      qrRotationSeconds: 20,
    } as any);
    draftEventId = draft.id;
  });

  afterAll(async () => {
    await prisma.event.delete({ where: { id: draftEventId } });
  });

  it("is visible to a member of the owning organization", async () => {
    const event = await getEventForViewer(draftEventId, organizerId);
    expect(event.name).toBe("Unpublished Draft Event");
  });

  it("is hidden from an unauthenticated viewer", async () => {
    await expect(getEventForViewer(draftEventId, undefined)).rejects.toThrow(/not found/i);
  });

  it("is hidden from an authenticated user who isn't a member of the owning organization", async () => {
    const outsider = await prisma.user.create({
      data: { name: "Outsider", email: `draft-outsider-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(getEventForViewer(draftEventId, outsider.id)).rejects.toThrow(/not found/i);
    await prisma.user.delete({ where: { id: outsider.id } });
  });
});
