import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";

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
      name: r.user.name,
      email: r.user.email,
      registeredAt: r.createdAt.toISOString(),
      attended: r.attendance ? "Yes" : "No",
      checkedInAt: r.attendance?.checkedInAt.toISOString() ?? "",
      method: r.attendance?.method ?? "",
      distanceMeters: r.attendance ? Math.round(r.attendance.distanceMeters) : "",
      locationConfidence: r.attendance?.locationConfidence ?? "",
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
  sheet.autoFilter = { from: "A1", to: `H1` };

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
