import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import {
  createClassroom,
  createSession,
  closeSession,
  manualOverrideClassAttendance,
  getMyAttendanceHistory,
  removeStudent,
  leaveClassroom,
  regenerateJoinCode,
  joinClassroom,
  getRoster,
  updateEnrollmentGradeYear,
  sortRosterBySeniority,
} from "../src/services/classroom.service.js";

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

describe("removing a student from a classroom", () => {
  it("deletes the enrollment and cascades to their attendance history", async () => {
    const leaver = await prisma.user.create({
      data: { name: "Leaving Student", email: `leaver-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await prisma.enrollment.create({ data: { classroomId, studentId: leaver.id } });

    const session = await createSession(classroomId, "Session Before Removal");
    await manualOverrideClassAttendance(classroomId, session.id, leaver.id, teacherId);
    await closeSession(classroomId, session.id);

    await removeStudent(classroomId, leaver.id);

    const enrollment = await prisma.enrollment.findUnique({
      where: { classroomId_studentId: { classroomId, studentId: leaver.id } },
    });
    expect(enrollment).toBeNull();

    const attendance = await prisma.classAttendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: leaver.id } },
    });
    expect(attendance).toBeNull();

    await prisma.classSession.delete({ where: { id: session.id } });
    await prisma.user.delete({ where: { id: leaver.id } });
  });

  it("rejects removing a student who was never enrolled", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Never Enrolled", email: `never-enrolled-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(removeStudent(classroomId, stranger.id)).rejects.toThrow(/not enrolled/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});

describe("a student leaving a classroom on their own", () => {
  it("deletes their own enrollment", async () => {
    const leaver = await prisma.user.create({
      data: { name: "Self-Leaving Student", email: `self-leaver-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await prisma.enrollment.create({ data: { classroomId, studentId: leaver.id } });

    await leaveClassroom(classroomId, leaver.id);

    const enrollment = await prisma.enrollment.findUnique({
      where: { classroomId_studentId: { classroomId, studentId: leaver.id } },
    });
    expect(enrollment).toBeNull();

    await prisma.user.delete({ where: { id: leaver.id } });
  });

  it("rejects leaving a classroom you were never enrolled in", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Never Enrolled Self", email: `never-enrolled-self-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(leaveClassroom(classroomId, stranger.id)).rejects.toThrow(/aren't enrolled/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});

describe("regenerating a classroom's join code", () => {
  it("issues a new code and invalidates the old one immediately", async () => {
    const before = await prisma.classroom.findUniqueOrThrow({ where: { id: classroomId } });
    const oldCode = before.joinCode;

    const updated = await regenerateJoinCode(classroomId);
    expect(updated.joinCode).not.toBe(oldCode);
    expect(updated.joinCode).toHaveLength(6);

    const latecomer = await prisma.user.create({
      data: { name: "Late Joiner", email: `late-joiner-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(joinClassroom(oldCode, latecomer.id)).rejects.toThrow(/no classroom found/i);

    const joined = await joinClassroom(updated.joinCode, latecomer.id);
    expect(joined.classroom.id).toBe(classroomId);

    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: latecomer.id } });
    await prisma.user.delete({ where: { id: latecomer.id } });
  });

  it("does not affect students already enrolled before the regeneration", async () => {
    // studentId (the suite-wide enrolled student from beforeAll) should
    // still be a member after any join-code churn from the test above.
    const enrollment = await prisma.enrollment.findUnique({
      where: { classroomId_studentId: { classroomId, studentId } },
    });
    expect(enrollment).not.toBeNull();
  });
});

describe("grade year (学年)", () => {
  it("stores the grade year given at join time", async () => {
    const joiner = await prisma.user.create({
      data: { name: "Grade Year Joiner", email: `grade-year-joiner-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: classroomId } });

    const { enrollment } = await joinClassroom(classroom.joinCode, joiner.id, "YEAR_2");
    expect(enrollment.gradeYear).toBe("YEAR_2");

    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: joiner.id } });
    await prisma.user.delete({ where: { id: joiner.id } });
  });

  it("defaults to unset when no grade year is given at join time", async () => {
    const joiner = await prisma.user.create({
      data: { name: "No Grade Year Joiner", email: `no-grade-year-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: classroomId } });

    const { enrollment } = await joinClassroom(classroom.joinCode, joiner.id);
    expect(enrollment.gradeYear).toBeNull();

    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: joiner.id } });
    await prisma.user.delete({ where: { id: joiner.id } });
  });

  it("lets the teacher set or correct a student's grade year after the fact", async () => {
    const updated = await updateEnrollmentGradeYear(classroomId, studentId, "YEAR_3");
    expect(updated.gradeYear).toBe("YEAR_3");

    const cleared = await updateEnrollmentGradeYear(classroomId, studentId, null);
    expect(cleared.gradeYear).toBeNull();
  });

  it("rejects setting a grade year for someone not enrolled in the classroom", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Not Enrolled", email: `not-enrolled-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(updateEnrollmentGradeYear(classroomId, stranger.id, "YEAR_1")).rejects.toThrow(/isn't enrolled/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });

  it("getRoster sorts seniors (alumni/graduate/4th year) before juniors, unset last", async () => {
    const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: classroomId } });
    const seeded = await Promise.all(
      ["YEAR_1", "ALUMNI", "YEAR_3"].map(async (year) => {
        const u = await prisma.user.create({
          data: { name: `Roster ${year}`, email: `roster-${year.toLowerCase()}-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
        });
        await joinClassroom(classroom.joinCode, u.id, year as any);
        return u.id;
      })
    );

    const roster = await getRoster(classroomId);
    const years = roster.filter((r) => seeded.includes(r.student.id)).map((r) => r.gradeYear);
    // ALUMNI must come before YEAR_3, which must come before YEAR_1.
    expect(years.indexOf("ALUMNI")).toBeLessThan(years.indexOf("YEAR_3"));
    expect(years.indexOf("YEAR_3")).toBeLessThan(years.indexOf("YEAR_1"));

    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: { in: seeded } } });
    await prisma.user.deleteMany({ where: { id: { in: seeded } } });
  });

  it("sortRosterBySeniority is a pure function that doesn't mutate its input", () => {
    const input = [
      { gradeYear: "YEAR_1" as const, student: { name: "A" } },
      { gradeYear: "ALUMNI" as const, student: { name: "B" } },
    ];
    const sorted = sortRosterBySeniority(input);
    expect(sorted[0].student.name).toBe("B");
    expect(input[0].gradeYear).toBe("YEAR_1"); // original order untouched
  });
});
