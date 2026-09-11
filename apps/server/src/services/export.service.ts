import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";

// A spreadsheet cell whose text starts with =, +, -, or @ is a formula to
// Excel/Sheets/LibreOffice, not literal text — and every field here that
// comes from a user-chosen name (display name, a teacher's session label)
// is exactly the kind of string an attacker could set to something like
// `=HYPERLINK(...)` or a DDE payload, then wait for an organizer to open
// the export. Prefixing a leading apostrophe is the standard mitigation:
// spreadsheet apps render it as plain text instead of evaluating it, and a
// value that already starts with a quote is untouched either way.
function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

async function getAttendeeRows(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw HttpError.notFound("Event not found");

  const registrations = await prisma.registration.findMany({
    where: { eventId },
    include: { user: { select: { name: true, email: true } }, attendance: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    event,
    rows: registrations.map((r) => ({
      name: sanitizeCell(r.user.name),
      email: sanitizeCell(r.user.email),
      registeredAt: r.createdAt.toISOString(),
      attended: r.attendance ? "Yes" : "No",
      checkedInAt: r.attendance?.checkedInAt.toISOString() ?? "",
      method: r.attendance?.method ?? "",
      distanceMeters: r.attendance ? Math.round(r.attendance.distanceMeters) : "",
      locationConfidence: r.attendance?.locationConfidence ?? "",
      flagged: r.attendance?.flagged ? "Yes" : "",
      flagReasons: r.attendance?.flagReasons.join("; ") ?? "",
    })),
  };
}

const COLUMNS = [
  { header: "Name", key: "name", width: 24 },
  { header: "Email", key: "email", width: 30 },
  { header: "Registered At", key: "registeredAt", width: 24 },
  { header: "Attended", key: "attended", width: 10 },
  { header: "Checked In At", key: "checkedInAt", width: 24 },
  { header: "Method", key: "method", width: 16 },
  { header: "Distance (m)", key: "distanceMeters", width: 14 },
  { header: "Location Confidence", key: "locationConfidence", width: 18 },
  { header: "Flagged", key: "flagged", width: 10 },
  { header: "Flag Reasons", key: "flagReasons", width: 30 },
];

export async function exportAttendeesCsv(eventId: string): Promise<{ filename: string; content: string }> {
  const { event, rows } = await getAttendeeRows(eventId);
  const header = COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((r) => COLUMNS.map((c) => csvEscape((r as any)[c.key])).join(","));
  return { filename: `${slug(event.name)}-attendees.csv`, content: [header, ...lines].join("\n") };
}

export async function exportAttendeesExcel(eventId: string): Promise<{ filename: string; buffer: Buffer }> {
  const { event, rows } = await getAttendeeRows(eventId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kehai Engine";
  const sheet = workbook.addWorksheet("Attendees");
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));
  sheet.autoFilter = { from: "A1", to: `J1` };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return { filename: `${slug(event.name)}-attendees.xlsx`, buffer: Buffer.from(arrayBuffer) };
}

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

// One row per student per session that had a class open on that day —
// present rows carry a real check-in, absent rows are synthesized (no
// ClassAttendance record exists for that student+session pair) so the
// export reads as a full attendance sheet, not just a log of check-ins.
async function getClassroomAttendanceRows(classroomId: string) {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  const [enrollments, sessions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classroomId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.classSession.findMany({
      where: { classroomId },
      include: { attendances: { select: { studentId: true, checkedInAt: true, flagged: true, flagReasons: true } } },
      orderBy: { date: "asc" },
    }),
  ]);

  const rows: Record<string, unknown>[] = [];
  for (const session of sessions) {
    const byStudent = new Map(session.attendances.map((a) => [a.studentId, a]));
    for (const enrollment of enrollments) {
      const attendance = byStudent.get(enrollment.student.id);
      rows.push({
        sessionDate: session.date.toISOString().slice(0, 10),
        sessionLabel: sanitizeCell(session.label ?? ""),
        name: sanitizeCell(enrollment.student.name),
        email: sanitizeCell(enrollment.student.email),
        present: attendance ? "Yes" : "No",
        checkedInAt: attendance?.checkedInAt.toISOString() ?? "",
        flagged: attendance?.flagged ? "Yes" : "",
        flagReasons: attendance?.flagReasons.join("; ") ?? "",
      });
    }
  }

  return { classroom, rows };
}

const CLASSROOM_COLUMNS = [
  { header: "Session Date", key: "sessionDate", width: 14 },
  { header: "Session Label", key: "sessionLabel", width: 20 },
  { header: "Name", key: "name", width: 24 },
  { header: "Email", key: "email", width: 30 },
  { header: "Present", key: "present", width: 10 },
  { header: "Checked In At", key: "checkedInAt", width: 24 },
  { header: "Flagged", key: "flagged", width: 10 },
  { header: "Flag Reasons", key: "flagReasons", width: 30 },
];

export async function exportClassroomAttendanceCsv(classroomId: string): Promise<{ filename: string; content: string }> {
  const { classroom, rows } = await getClassroomAttendanceRows(classroomId);
  const header = CLASSROOM_COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((r) => CLASSROOM_COLUMNS.map((c) => csvEscape((r as any)[c.key])).join(","));
  return { filename: `${slug(classroom.name)}-attendance.csv`, content: [header, ...lines].join("\n") };
}

export async function exportClassroomAttendanceExcel(classroomId: string): Promise<{ filename: string; buffer: Buffer }> {
  const { classroom, rows } = await getClassroomAttendanceRows(classroomId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kehai Engine";
  const sheet = workbook.addWorksheet("Attendance");
  sheet.columns = CLASSROOM_COLUMNS;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));
  sheet.autoFilter = { from: "A1", to: `H1` };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return { filename: `${slug(classroom.name)}-attendance.xlsx`, buffer: Buffer.from(arrayBuffer) };
}
