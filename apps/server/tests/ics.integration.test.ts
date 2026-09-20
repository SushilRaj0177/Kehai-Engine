import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createClassroom, createSession, closeSession } from "../src/services/classroom.service.js";
import { generateClassroomIcs } from "../src/services/ics.service.js";
import { HttpError } from "../src/lib/http-error.js";

let teacherId: string;
let classroomId: string;

beforeAll(async () => {
  const teacher = await prisma.user.create({
    data: { name: "Ics Teacher", email: `ics-teacher-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  teacherId = teacher.id;
  const classroom = await createClassroom(teacherId, { name: "Ics Test Classroom" });
  classroomId = classroom.id;
});

afterAll(async () => {
  await prisma.classSession.deleteMany({ where: { classroomId } });
  await prisma.classroom.delete({ where: { id: classroomId } });
  await prisma.user.delete({ where: { id: teacherId } });
  await prisma.$disconnect();
});

describe("generateClassroomIcs", () => {
  it("throws for a nonexistent classroom", async () => {
    await expect(generateClassroomIcs("nonexistent-id")).rejects.toThrow(HttpError);
  });

  it("produces a valid, empty calendar when the classroom has no sessions yet", async () => {
    const { content } = await generateClassroomIcs(classroomId);
    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("END:VCALENDAR");
    expect(content).not.toContain("BEGIN:VEVENT");
  });

  it("includes one VEVENT per session, using the session's real opened/closed time", async () => {
    const session = await createSession(classroomId, "Lecture 1");
    await closeSession(classroomId, session.id);

    const { content, filename } = await generateClassroomIcs(classroomId);
    expect(content).toContain("BEGIN:VEVENT");
    expect(content).toContain(`UID:${session.id}@kehai-engine`);
    expect(content).toContain("SUMMARY:Lecture 1");
    expect(filename).toBe("ics-test-classroom.ics");
  });

  it("gives a still-open session a nominal 1-hour block instead of a zero-length event", async () => {
    const session = await createSession(classroomId, "Open Session");
    const { content } = await generateClassroomIcs(classroomId);

    const dtstartMatch = content.match(new RegExp(`UID:${session.id}@kehai-engine\\r\\nDTSTAMP:[^\\r]+\\r\\nDTSTART:([^\\r]+)\\r\\nDTEND:([^\\r]+)`));
    expect(dtstartMatch).toBeTruthy();
    const [, start, end] = dtstartMatch!;
    expect(start).not.toBe(end);

    await closeSession(classroomId, session.id);
  });
});
