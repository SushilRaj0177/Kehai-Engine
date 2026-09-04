import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole, optionalAuth } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";
import { updateEventSchema, eventStatusSchema } from "../validators/event.js";
import * as eventService from "../services/event.service.js";
import { prisma } from "../lib/prisma.js";
import { emitEventUpdate } from "../realtime/socket.js";

export const eventRouter = Router();

// Public: browse published/active events (attendee-facing discovery)
eventRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      where: { status: { in: ["PUBLISHED", "ACTIVE"] } },
      orderBy: { startsAt: "asc" },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { registrations: true, attendances: true } },
      },
    });
    res.json(events);
  })
);

eventRouter.get(
  "/:eventId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { registrations: true, attendances: true } },
      },
    });
    if (!event) throw HttpError.notFound("Event not found");

    let isRegistered = false;
    let hasAttended = false;
    if (req.user) {
      const [reg, att] = await Promise.all([
        prisma.registration.findUnique({ where: { eventId_userId: { eventId: event.id, userId: req.user.id } } }),
        prisma.attendanceRecord.findUnique({ where: { eventId_userId: { eventId: event.id, userId: req.user.id } } }),
      ]);
      isRegistered = !!reg;
      hasAttended = !!att;
    }

    // Never leak the QR signing secret to clients
    const { qrSecret, ...safeEvent } = event;
    res.json({ ...safeEvent, isRegistered, hasAttended });
  })
);

eventRouter.patch(
  "/:eventId",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const input = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(req.params.eventId, input as any);
    emitEventUpdate(event.id, { type: "details_updated" });
    res.json(event);
  })
);

eventRouter.post(
  "/:eventId/status",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { status } = eventStatusSchema.parse(req.body);
    const event = await eventService.transitionEventStatus(req.params.eventId, status);
    emitEventUpdate(event.id, { type: "status_changed", status: event.status });
    res.json(event);
  })
);

eventRouter.delete(
  "/:eventId",
  requireAuth,
  requireOrgRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await eventService.deleteEvent(req.params.eventId);
    res.status(204).end();
  })
);

eventRouter.post(
  "/:eventId/register",
  requireAuth,
  asyncHandler(async (req, res) => {
    const registration = await eventService.registerForEvent(req.params.eventId, req.user!.id);
    res.status(201).json(registration);
  })
);

eventRouter.get(
  "/:eventId/qr",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const qr = await eventService.issueEventQr(req.params.eventId);
    res.json(qr);
  })
);

eventRouter.post(
  "/:eventId/qr/revoke",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    await eventService.revokeEventQr(req.params.eventId);
    res.status(204).end();
  })
);

eventRouter.get(
  "/:eventId/attendees",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { q, status } = req.query as { q?: string; status?: "attended" | "not_attended" };

    const registrations = await prisma.registration.findMany({
      where: {
        eventId: req.params.eventId,
        user: q
          ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
          : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } }, attendance: true },
      orderBy: { createdAt: "asc" },
    });

    const filtered = registrations.filter((r) => {
      if (status === "attended") return !!r.attendance;
      if (status === "not_attended") return !r.attendance;
      return true;
    });

    res.json(
      filtered.map((r) => ({
        registrationId: r.id,
        user: r.user,
        registeredAt: r.createdAt,
        attended: !!r.attendance,
        checkedInAt: r.attendance?.checkedInAt ?? null,
        distanceMeters: r.attendance?.distanceMeters ?? null,
        method: r.attendance?.method ?? null,
      }))
    );
  })
);
