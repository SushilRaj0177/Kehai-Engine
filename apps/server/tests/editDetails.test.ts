import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createEvent, updateEvent } from "../src/services/event.service.js";
import { createClassroom, updateClassroom } from "../src/services/classroom.service.js";
import { updateEventSchema } from "../src/validators/event.js";
import { updateClassroomSchema } from "../src/validators/classroom.js";

let orgId: string;
let userId: string;
let eventId: string;
let classroomId: string;

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Edit Clear Test Org " + crypto.randomUUID(), slug: "edit-clear-org-" + crypto.randomUUID() },
  });
  orgId = org.id;

  const user = await prisma.user.create({
    data: { name: "Edit Clear Tester", email: `edit-clear-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  userId = user.id;

  const event = await createEvent(orgId, userId, {
    name: "Clearable Event",
    description: "Has a description to start with",
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

  const classroom = await createClassroom(userId, {
    name: "Clearable Classroom",
    courseCode: "CS101",
    semesterLabel: "Fall 2026",
  });
  classroomId = classroom.id;
});

afterAll(async () => {
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.classroom.delete({ where: { id: classroomId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

describe("clearing optional fields via edit panels", () => {
  it("accepts an explicit null for event description and actually clears it", () => {
    expect(() => updateEventSchema.parse({ description: null })).not.toThrow();
  });

  it("accepts an explicit null for classroom courseCode/semesterLabel", () => {
    expect(() => updateClassroomSchema.parse({ courseCode: null, semesterLabel: null })).not.toThrow();
  });

  it("persists a cleared event description as null, not the stale value", async () => {
    const updated = await updateEvent(eventId, { description: null });
    expect(updated.description).toBeNull();
  });

  it("persists cleared classroom courseCode/semesterLabel as null, not the stale value", async () => {
    const updated = await updateClassroom(classroomId, { courseCode: null, semesterLabel: null });
    expect(updated.courseCode).toBeNull();
    expect(updated.semesterLabel).toBeNull();
  });
});
