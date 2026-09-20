import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { prisma } from "../lib/prisma.js";

let io: SocketIOServer | null = null;

/**
 * Realtime transport for the organizer dashboard. Degrades gracefully:
 * if a client can't establish a socket connection (corporate proxy, etc.)
 * the dashboard falls back to periodic polling — see web/lib/realtime.ts.
 */
export function initRealtime(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    path: "/realtime",
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(); // allow anonymous connect; room join still requires membership check server-side
    try {
      const payload = verifyAccessToken(token);
      (socket.data as any).userId = payload.sub;
    } catch {
      // ignore invalid token — socket stays unauthenticated
    }
    next();
  });

  io.on("connection", (socket) => {
    socket.on("join:event", (eventId: string) => {
      if (typeof eventId !== "string" || eventId.length === 0) return;
      void canAccessEvent((socket.data as any).userId, eventId).then((allowed) => {
        if (allowed) socket.join(eventRoom(eventId));
      });
    });
    socket.on("leave:event", (eventId: string) => {
      if (typeof eventId === "string") socket.leave(eventRoom(eventId));
    });

    socket.on("join:classroom", (classroomId: string) => {
      if (typeof classroomId !== "string" || classroomId.length === 0) return;
      void canAccessClassroom((socket.data as any).userId, classroomId).then((allowed) => {
        if (allowed) socket.join(classroomRoom(classroomId));
      });
    });
    socket.on("leave:classroom", (classroomId: string) => {
      if (typeof classroomId === "string") socket.leave(classroomRoom(classroomId));
    });
  });

  return io;
}

// Mirrors the REST API's own authorization boundary — an event/classroom
// room broadcasts real attendee/student names and running counts live, and
// (for events) can exist while still DRAFT, deliberately hidden from the
// public REST API. Without this check, anyone who could connect to the
// socket and knew or guessed an id — no membership required — could watch
// that live feed, silently bypassing every membership check the REST
// routes enforce. An unauthenticated socket (no valid token) can never
// join any room.
export async function canAccessEvent(userId: string | undefined, eventId: string): Promise<boolean> {
  if (!userId) return false;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizationId: true } });
  if (!event) return false;
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: event.organizationId } },
  });
  return !!membership;
}

export async function canAccessClassroom(userId: string | undefined, classroomId: string): Promise<boolean> {
  if (!userId) return false;
  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { teacherId: true } });
  if (!classroom) return false;
  if (classroom.teacherId === userId) return true;
  const enrollment = await prisma.enrollment.findUnique({ where: { classroomId_studentId: { classroomId, studentId: userId } } });
  return !!enrollment;
}

function eventRoom(eventId: string) {
  return `event:${eventId}`;
}

export function emitAttendanceUpdate(
  eventId: string,
  payload: {
    type: "checkin";
    attendeeName: string;
    checkedInAt: string;
    totalAttendance: number;
    totalRegistrations: number;
    attendanceRate: number;
  }
) {
  io?.to(eventRoom(eventId)).emit("attendance:update", payload);
}

export function emitEventUpdate(eventId: string, payload: Record<string, unknown>) {
  io?.to(eventRoom(eventId)).emit("event:update", payload);
}

function classroomRoom(classroomId: string) {
  return `classroom:${classroomId}`;
}

export function emitClassroomJoin(
  classroomId: string,
  payload: { studentName: string; joinedAt: string; totalEnrolled: number }
) {
  io?.to(classroomRoom(classroomId)).emit("classroom:join", payload);
}

export function emitClassAttendanceUpdate(
  classroomId: string,
  payload: {
    type: "checkin";
    studentName: string;
    checkedInAt: string;
    totalPresent: number;
    totalEnrolled: number;
    attendanceRate: number;
  }
) {
  io?.to(classroomRoom(classroomId)).emit("classattendance:update", payload);
}
