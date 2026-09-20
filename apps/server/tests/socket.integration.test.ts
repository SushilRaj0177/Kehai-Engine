import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { canAccessEvent, canAccessClassroom } from "../src/realtime/socket.js";
import { createClassroom } from "../src/services/classroom.service.js";

let orgId: string;
let eventId: string;
let memberId: string;
let outsiderId: string;
let teacherId: string;
let studentId: string;
let classroomId: string;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: "Socket Owner", email: `socket-owner-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  const org = await prisma.organization.create({ data: { name: "Socket Test Org", slug: `socket-org-${crypto.randomUUID()}` } });
  orgId = org.id;
  await prisma.membership.create({ data: { organizationId: orgId, userId: owner.id, role: "OWNER" } });
  memberId = owner.id;

  const event = await prisma.event.create({
    data: {
      organizationId: orgId,
      name: "Socket Test Event",
      venue: "Somewhere",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600_000),
      latitude: 0,
      longitude: 0,
      geofenceRadiusM: 100,
      qrSecret: "secret",
      createdById: owner.id,
    },
  });
  eventId = event.id;

  const outsider = await prisma.user.create({
    data: { name: "Socket Outsider", email: `socket-outsider-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  outsiderId = outsider.id;

  const teacher = await prisma.user.create({
    data: { name: "Socket Teacher", email: `socket-teacher-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  teacherId = teacher.id;
  const classroom = await createClassroom(teacherId, { name: "Socket Test Classroom" });
  classroomId = classroom.id;

  const student = await prisma.user.create({
    data: { name: "Socket Student", email: `socket-student-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  studentId = student.id;
  await prisma.enrollment.create({ data: { classroomId, studentId } });
});

afterAll(async () => {
  await prisma.enrollment.deleteMany({ where: { classroomId } });
  await prisma.classroom.delete({ where: { id: classroomId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.membership.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: [memberId, outsiderId, teacherId, studentId] } } });
  await prisma.$disconnect();
});

describe("canAccessEvent", () => {
  it("allows an org member", async () => {
    expect(await canAccessEvent(memberId, eventId)).toBe(true);
  });
  it("rejects a user who isn't a member of the event's org", async () => {
    expect(await canAccessEvent(outsiderId, eventId)).toBe(false);
  });
  it("rejects an unauthenticated socket (no userId)", async () => {
    expect(await canAccessEvent(undefined, eventId)).toBe(false);
  });
  it("rejects a nonexistent event id", async () => {
    expect(await canAccessEvent(memberId, "nonexistent-id")).toBe(false);
  });
});

describe("canAccessClassroom", () => {
  it("allows the classroom's teacher", async () => {
    expect(await canAccessClassroom(teacherId, classroomId)).toBe(true);
  });
  it("allows an enrolled student", async () => {
    expect(await canAccessClassroom(studentId, classroomId)).toBe(true);
  });
  it("rejects a user with no enrollment and who isn't the teacher", async () => {
    expect(await canAccessClassroom(outsiderId, classroomId)).toBe(false);
  });
  it("rejects an unauthenticated socket (no userId)", async () => {
    expect(await canAccessClassroom(undefined, classroomId)).toBe(false);
  });
});
