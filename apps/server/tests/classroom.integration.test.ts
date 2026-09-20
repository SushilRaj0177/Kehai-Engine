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
  bulkEnrollStudents,
  getLeaderboard,
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

describe("bulk roster enrollment", () => {
  let bulkStudentId: string;
  let bulkStudentEmail: string;

  beforeAll(async () => {
    const bulkStudent = await prisma.user.create({
      data: { name: "Bulk Student", email: `bulk-student-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    bulkStudentId = bulkStudent.id;
    bulkStudentEmail = bulkStudent.email;
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: bulkStudentId } });
    await prisma.user.delete({ where: { id: bulkStudentId } });
  });

  it("enrolls existing users by email and reports ones with no account", async () => {
    const result = await bulkEnrollStudents(classroomId, [bulkStudentEmail, "nobody-at-all@example.com"]);
    expect(result.enrolled).toEqual([bulkStudentEmail.toLowerCase()]);
    expect(result.notFound).toEqual(["nobody-at-all@example.com"]);
    expect(result.alreadyEnrolled).toEqual([]);

    const enrollment = await prisma.enrollment.findUnique({ where: { classroomId_studentId: { classroomId, studentId: bulkStudentId } } });
    expect(enrollment).toBeTruthy();
  });

  it("reports an already-enrolled email instead of throwing, and doesn't duplicate the enrollment", async () => {
    const result = await bulkEnrollStudents(classroomId, [bulkStudentEmail]);
    expect(result.alreadyEnrolled).toEqual([bulkStudentEmail.toLowerCase()]);
    expect(result.enrolled).toEqual([]);

    const count = await prisma.enrollment.count({ where: { classroomId, studentId: bulkStudentId } });
    expect(count).toBe(1);
  });

  it("de-duplicates repeated emails in the same call and normalizes case", async () => {
    await prisma.enrollment.deleteMany({ where: { classroomId, studentId: bulkStudentId } });
    const shouted = bulkStudentEmail.toUpperCase();
    const result = await bulkEnrollStudents(classroomId, [shouted, shouted, bulkStudentEmail]);
    expect(result.enrolled).toEqual([bulkStudentEmail.toLowerCase()]);
  });
});

describe("leaderboard", () => {
  let boardClassroomId: string;
  let keenStudentId: string;
  let absentStudentId: string;

  beforeAll(async () => {
    const board = await createClassroom(teacherId, { name: "Leaderboard Test Classroom" });
    boardClassroomId = board.id;

    const keen = await prisma.user.create({
      data: { name: "Keen Student", email: `keen-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    keenStudentId = keen.id;
    const absent = await prisma.user.create({
      data: { name: "Absent Student", email: `absent-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    absentStudentId = absent.id;
    await prisma.enrollment.createMany({
      data: [
        { classroomId: boardClassroomId, studentId: keenStudentId },
        { classroomId: boardClassroomId, studentId: absentStudentId },
      ],
    });

    for (let i = 0; i < 2; i++) {
      const session = await createSession(boardClassroomId, `Session ${i}`);
      await manualOverrideClassAttendance(boardClassroomId, session.id, keenStudentId, teacherId);
      await closeSession(boardClassroomId, session.id);
    }
  });

  afterAll(async () => {
    await prisma.classAttendance.deleteMany({ where: { enrollment: { classroomId: boardClassroomId } } });
    await prisma.classSession.deleteMany({ where: { classroomId: boardClassroomId } });
    await prisma.enrollment.deleteMany({ where: { classroomId: boardClassroomId } });
    await prisma.classroom.delete({ where: { id: boardClassroomId } });
    await prisma.user.deleteMany({ where: { id: { in: [keenStudentId, absentStudentId] } } });
  });

  it("ranks a perfect-attendance student above one with none, by current streak", async () => {
    // Both sessions were opened back-to-back in this test, so they land on
    // the same calendar day — streaks are computed per calendar day (see
    // getLeaderboard's "attended at least one session that day" rule), so
    // that's one streak-day, not two, even though two individual session
    // attendance records exist (reflected in attendanceRate instead).
    const board = await getLeaderboard(boardClassroomId);
    expect(board).toHaveLength(2);
    expect(board[0].student.id).toBe(keenStudentId);
    expect(board[0].currentStreak).toBe(1);
    expect(board[0].longestStreak).toBe(1);
    expect(board[0].attendanceRate).toBe(1);

    expect(board[1].student.id).toBe(absentStudentId);
    expect(board[1].currentStreak).toBe(0);
    expect(board[1].attendanceRate).toBe(0);
  });

  it("returns an empty board for a classroom with no sessions yet", async () => {
    const empty = await createClassroom(teacherId, { name: "No Sessions Yet" });
    await prisma.enrollment.create({ data: { classroomId: empty.id, studentId: keenStudentId } });
    const board = await getLeaderboard(empty.id);
    expect(board).toEqual([]);
    await prisma.enrollment.deleteMany({ where: { classroomId: empty.id } });
    await prisma.classroom.delete({ where: { id: empty.id } });
  });
});
