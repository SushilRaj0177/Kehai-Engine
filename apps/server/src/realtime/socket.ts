import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/tokens.js";

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
      if (typeof eventId === "string" && eventId.length > 0) {
        socket.join(eventRoom(eventId));
      }
    });
    socket.on("leave:event", (eventId: string) => {
      if (typeof eventId === "string") socket.leave(eventRoom(eventId));
    });
  });

  return io;
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
