import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createClassroom, createSession, closeSession, manualOverrideClassAttendance } from "../src/services/classroom.service.js";
import { sendLowAttendanceNudges, sendManualNudge } from "../src/services/nudge.service.js";

let teacherId: string;
let atRiskStudentId: string;
let healthyStudentId: string;
let classroomId: string;
let thinClassroomId: string;
let atRiskEnrollmentId: string;

beforeAll(async () => {
  const teacher = await prisma.user.create({
    data: { name: "Nudge Teacher", email: `nudge-teacher-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  teacherId = teacher.id;

  const atRiskStudent = await prisma.user.create({
    data: { name: "At Risk", email: `at-risk-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  atRiskStudentId = atRiskStudent.id;

  const healthyStudent = await prisma.user.create({
    data: { name: "Healthy Student", email: `healthy-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  healthyStudentId = healthyStudent.id;

  const classroom = await createClassroom(teacherId, { name: "Nudge Test Classroom" });
  classroomId = classroom.id;

  const atRiskEnrollment = await prisma.enrollment.create({ data: { classroomId, studentId: atRiskStudentId } });
  atRiskEnrollmentId = atRiskEnrollment.id;
  await prisma.enrollment.create({ data: { classroomId, studentId: healthyStudentId } });

  // 4 sessions: the at-risk student attends only 1 (25%), the healthy
  // student attends all 4 (100%).
  for (let i = 0; i < 4; i++) {
    const session = await createSession(classroomId);
    if (i === 0) await manualOverrideClassAttendance(classroomId, session.id, atRiskStudentId, teacherId);
    await manualOverrideClassAttendance(classroomId, session.id, healthyStudentId, teacherId);
    await closeSession(classroomId, session.id);
  }

  // A second classroom with too few sessions to be judged yet — should
  // never nudge regardless of how bad its attendance looks.
  const thinClassroom = await createClassroom(teacherId, { name: "Too New To Judge" });
  thinClassroomId = thinClassroom.id;
  await prisma.enrollment.create({ data: { classroomId: thinClassroomId, studentId: atRiskStudentId } });
  const thinSession = await createSession(thinClassroomId);
  await closeSession(thinClassroomId, thinSession.id);
});

afterAll(async () => {
  for (const id of [classroomId, thinClassroomId]) {
    await prisma.classAttendance.deleteMany({ where: { enrollment: { classroomId: id } } });
    await prisma.classSession.deleteMany({ where: { classroomId: id } });
    await prisma.enrollment.deleteMany({ where: { classroomId: id } });
    await prisma.classroom.delete({ where: { id } });
  }
  await prisma.user.delete({ where: { id: teacherId } });
  await prisma.user.delete({ where: { id: atRiskStudentId } });
  await prisma.user.delete({ where: { id: healthyStudentId } });
  await prisma.$disconnect();
});

describe("low-attendance nudges", () => {
  it("emails only the student under the risk threshold in a classroom with enough sessions, and sets the cooldown", async () => {
    const { sent } = await sendLowAttendanceNudges();
    expect(sent).toBe(1);

    const atRisk = await prisma.enrollment.findUnique({ where: { id: atRiskEnrollmentId } });
    expect(atRisk?.lastNudgedAt).not.toBeNull();

    const healthy = await prisma.enrollment.findFirst({ where: { classroomId, studentId: healthyStudentId } });
    expect(healthy?.lastNudgedAt).toBeNull();
  });

  it("does not re-nudge the same enrollment while still within the cooldown window", async () => {
    const { sent } = await sendLowAttendanceNudges();
    expect(sent).toBe(0);
  });

  it("nudges again once the cooldown has fully elapsed", async () => {
    const eightDaysFromNow = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const { sent } = await sendLowAttendanceNudges(eightDaysFromNow);
    expect(sent).toBe(1);
  });
});

describe("manual, teacher-triggered nudge", () => {
  it("sends immediately and stamps lastNudgedAt, ignoring the automated cooldown", async () => {
    // The suite above already nudged this enrollment and set a cooldown
    // (using a synthetic future "now", so its own lastNudgedAt can sit
    // ahead of real time) — a manual nudge should still go through right
    // away regardless, stamping a genuine current timestamp.
    const beforeCall = Date.now();
    await sendManualNudge(classroomId, atRiskStudentId);
    const afterCall = Date.now();

    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: atRiskEnrollmentId } });
    expect(enrollment.lastNudgedAt).not.toBeNull();
    expect(enrollment.lastNudgedAt!.getTime()).toBeGreaterThanOrEqual(beforeCall);
    expect(enrollment.lastNudgedAt!.getTime()).toBeLessThanOrEqual(afterCall);
  });

  it("rejects nudging a student who isn't enrolled", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Nudge Stranger", email: `nudge-stranger-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(sendManualNudge(classroomId, stranger.id)).rejects.toThrow(/not enrolled/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });

  it("rejects nudging a student who has unsubscribed from these emails", async () => {
    await prisma.user.update({ where: { id: healthyStudentId }, data: { emailNotificationsEnabled: false } });
    await expect(sendManualNudge(classroomId, healthyStudentId)).rejects.toThrow(/unsubscribed/i);
    await prisma.user.update({ where: { id: healthyStudentId }, data: { emailNotificationsEnabled: true } });
  });
});
