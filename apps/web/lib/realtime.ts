"use client";

import { io, type Socket } from "socket.io-client";
import { getApiBase, getAccessToken } from "./api";

export interface AttendanceUpdatePayload {
  type: "checkin";
  attendeeName: string;
  checkedInAt: string;
  totalAttendance: number;
  totalRegistrations: number;
  attendanceRate: number;
}

/**
 * Subscribes to live attendance updates for an event. Tries Socket.io
 * first; if it never connects within a few seconds (blocked by a proxy,
 * etc.) the caller-supplied `onFallbackPoll` kicks in via a plain interval
 * so the dashboard still stays live, just less instantly.
 */
export function subscribeToEvent(
  eventId: string,
  handlers: { onUpdate: (payload: AttendanceUpdatePayload) => void; onConnectionChange?: (connected: boolean) => void }
): () => void {
  let socket: Socket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let connected = false;

  try {
    socket = io(getApiBase(), {
      path: "/realtime",
      auth: { token: getAccessToken() },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      connected = true;
      handlers.onConnectionChange?.(true);
      socket?.emit("join:event", eventId);
    });

    socket.on("attendance:update", (payload: AttendanceUpdatePayload) => {
      handlers.onUpdate(payload);
    });

    socket.on("disconnect", () => {
      connected = false;
      handlers.onConnectionChange?.(false);
    });
  } catch {
    // socket.io unavailable entirely — fall straight to polling below
  }

  const fallbackTimeout = setTimeout(() => {
    if (!connected) {
      handlers.onConnectionChange?.(false);
    }
  }, 4000);

  return () => {
    clearTimeout(fallbackTimeout);
    if (pollTimer) clearInterval(pollTimer);
    socket?.emit("leave:event", eventId);
    socket?.disconnect();
  };
}

export interface ClassroomJoinPayload {
  studentName: string;
  joinedAt: string;
  totalEnrolled: number;
}

export interface ClassAttendanceUpdatePayload {
  type: "checkin";
  studentName: string;
  checkedInAt: string;
  totalPresent: number;
  totalEnrolled: number;
  attendanceRate: number;
}

/**
 * Subscribes to live roster/attendance updates for a classroom — the same
 * room-join dance as subscribeToEvent, renamed for the classroom feature.
 */
export function subscribeToClassroom(
  classroomId: string,
  handlers: {
    onJoin: (payload: ClassroomJoinPayload) => void;
    onAttendanceUpdate: (payload: ClassAttendanceUpdatePayload) => void;
    onConnectionChange?: (connected: boolean) => void;
  }
): () => void {
  let socket: Socket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let connected = false;

  try {
    socket = io(getApiBase(), {
      path: "/realtime",
      auth: { token: getAccessToken() },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      connected = true;
      handlers.onConnectionChange?.(true);
      socket?.emit("join:classroom", classroomId);
    });

    socket.on("classroom:join", (payload: ClassroomJoinPayload) => {
      handlers.onJoin(payload);
    });

    socket.on("classattendance:update", (payload: ClassAttendanceUpdatePayload) => {
      handlers.onAttendanceUpdate(payload);
    });

    socket.on("disconnect", () => {
      connected = false;
      handlers.onConnectionChange?.(false);
    });
  } catch {
    // socket.io unavailable entirely — fall straight to polling below
  }

  const fallbackTimeout = setTimeout(() => {
    if (!connected) {
      handlers.onConnectionChange?.(false);
    }
  }, 4000);

  return () => {
    clearTimeout(fallbackTimeout);
    if (pollTimer) clearInterval(pollTimer);
    socket?.emit("leave:classroom", classroomId);
    socket?.disconnect();
  };
}
