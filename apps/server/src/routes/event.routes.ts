import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole, optionalAuth } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";
import { updateEventSchema, eventStatusSchema } from "../validators/event.js";
import * as eventService from "../services/event.service.js";
import * as icsService from "../services/ics.service.js";
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
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { registrations: true, attendances: true } },
      },
    });
    // This page's own heading promises "live right now" — a plain
    // soonest-first sort broke that promise by letting a PUBLISHED event
    // starting next week outrank an ACTIVE one happening at this very
    // moment. Live events surface first; everything else follows soonest
    // first, same as before.
    events.sort((a, b) => {
      if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
      return a.startsAt.getTime() - b.startsAt.getTime();
    });
    res.json(events);
  })
);

// Must be registered before "/:eventId" — otherwise Express would match
// "mine" as an :eventId param and this route would never be reached.
eventRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user!.id },
      include: {
        event: { include: { organization: { select: { id: true, name: true, slug: true } } } },
        attendance: true,
      },
      orderBy: { event: { startsAt: "desc" } },
    });

    res.json(
      registrations.map((r) => {
        const { qrSecret, ...safeEvent } = r.event;
        return {
          event: safeEvent,
          registeredAt: r.createdAt,
          attended: !!r.attendance,
          checkedInAt: r.attendance?.checkedInAt ?? null,
          waitlisted: r.waitlisted,
        };
      })
    );
  })
);

// Public — same audience as browsing the event itself, no registration or
// org membership required, so a visitor deciding whether to attend can
// already save the date.
eventRouter.get(
  "/:eventId/calendar.ics",
  asyncHandler(async (req, res) => {
    const { filename, content } = await icsService.generateEventIcs(req.params.eventId);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  })
);

eventRouter.get(
  "/:eventId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json(await eventService.getEventForViewer(req.params.eventId, req.user?.id));
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

eventRouter.delete(
  "/:eventId/registrations/:userId",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    await eventService.removeRegistration(req.params.eventId, req.params.userId);
    res.status(204).end();
  })
);

eventRouter.delete(
  "/:eventId/register",
  requireAuth,
  asyncHandler(async (req, res) => {
    await eventService.cancelMyRegistration(req.params.eventId, req.user!.id);
    res.status(204).end();
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
        flagged: r.attendance?.flagged ?? false,
        flagReasons: r.attendance?.flagReasons ?? [],
        waitlisted: r.waitlisted,
      }))
    );
  })
);
