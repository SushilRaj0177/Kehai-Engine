import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createClassroom, createSession, closeSession, manualOverrideClassAttendance, getMyAttendanceHistory } from "../src/services/classroom.service.js";

let teacherId: string;
let studentId: string;
let classroomId: string;

beforeAll(async () => {
  const teacher = await prisma.user.create({
    data: { name: "History Teacher", email: `history-teacher-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  teacherId = teacher.id;

  const student = await prisma.user.create({
    data: { name: "History Student", email: `history-student-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  studentId = student.id;

  const classroom = await createClassroom(teacherId, { name: "History Test Classroom" });
  classroomId = classroom.id;

  await prisma.enrollment.create({ data: { classroomId, studentId } });
});

afterAll(async () => {
  await prisma.classAttendance.deleteMany({ where: { enrollment: { classroomId } } });
  await prisma.classSession.deleteMany({ where: { classroomId } });
  await prisma.enrollment.deleteMany({ where: { classroomId } });
  await prisma.classroom.delete({ where: { id: classroomId } });
  await prisma.user.delete({ where: { id: teacherId } });
  await prisma.user.delete({ where: { id: studentId } });
  await prisma.$disconnect();
});

describe("student attendance history", () => {
  it("lists every session, marking which ones the student actually attended", async () => {
    const attended = await createSession(classroomId, "Attended Session");
    await manualOverrideClassAttendance(classroomId, attended.id, studentId, teacherId);
    await closeSession(classroomId, attended.id);

    const missed = await createSession(classroomId, "Missed Session");
    await closeSession(classroomId, missed.id);

    const history = await getMyAttendanceHistory(classroomId, studentId);
    expect(history).toHaveLength(2);

    const attendedRow = history.find((r) => r.id === attended.id);
    const missedRow = history.find((r) => r.id === missed.id);
    expect(attendedRow?.present).toBe(true);
    expect(attendedRow?.method).toBe("MANUAL_OVERRIDE");
    expect(attendedRow?.checkedInAt).not.toBeNull();
    expect(missedRow?.present).toBe(false);
    expect(missedRow?.checkedInAt).toBeNull();
  });

  it("rejects a caller who isn't enrolled in the classroom", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Stranger", email: `stranger-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(getMyAttendanceHistory(classroomId, stranger.id)).rejects.toThrow(/not enrolled/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});
