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
