import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { env } from "../config/env.js";

// RFC 5545 wants CRLF line endings and folds any line over 75 octets — most
// calendar apps tolerate unfolded lines fine, but staying spec-correct here
// costs nothing and avoids a rare client choking on a long description.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function generateEventIcs(eventId: string): Promise<{ filename: string; content: string }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { organization: { select: { name: true } } },
  });
  if (!event) throw HttpError.notFound("Event not found");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kehai Engine//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@kehai-engine`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.name)}`,
    `LOCATION:${escapeIcsText(event.venue)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    `URL:${env.WEB_ORIGIN}/events/${event.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const content = lines.map(foldLine).join("\r\n") + "\r\n";
  return { filename: `${slug(event.name)}.ics`, content };
}

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

// Classrooms don't have a fixed recurring schedule in this data model —
// sessions are opened on demand by the teacher, not pre-scheduled to a
// weekly day/time — so there's no future occurrence to compute an RRULE
// from. What this exports instead is genuinely useful on its own: one
// VEVENT per session that's actually happened, at its real opened→closed
// time, so a student (or teacher) can pull the semester's actual class
// times into their calendar as a record, re-importable at any point to
// pick up newly-opened sessions since the last export.
export async function generateClassroomIcs(classroomId: string): Promise<{ filename: string; content: string }> {
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) throw HttpError.notFound("Classroom not found");

  const sessions = await prisma.classSession.findMany({
    where: { classroomId },
    orderBy: { date: "asc" },
    take: 1000,
  });

  const events = sessions.flatMap((s) => {
    const start = s.openedAt;
    // A still-open session (or one closed the instant it opened, which
    // shouldn't normally happen but would otherwise produce a zero-length
    // VEVENT some calendar apps render oddly) gets a nominal 1-hour block.
    const end = s.closedAt && s.closedAt.getTime() > start.getTime() ? s.closedAt : new Date(start.getTime() + 3600_000);
    return [
      "BEGIN:VEVENT",
      `UID:${s.id}@kehai-engine`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(s.label || classroom.name)}`,
      `URL:${env.WEB_ORIGIN}/classrooms/${classroomId}`,
      "END:VEVENT",
    ];
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kehai Engine//Classroom Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ];

  const content = lines.map(foldLine).join("\r\n") + "\r\n";
  return { filename: `${slug(classroom.name)}.ics`, content };
}
