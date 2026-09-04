import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import { attendanceRateLimit } from "../middleware/rateLimit.js";
import { checkInSchema } from "../validators/event.js";
import * as attendanceService from "../services/attendance.service.js";
import { z } from "zod";

export const attendanceRouter = Router();

attendanceRouter.post(
  "/:eventId/checkin",
  requireAuth,
  attendanceRateLimit,
  asyncHandler(async (req, res) => {
    const input = checkInSchema.parse(req.body);
    const result = await attendanceService.checkIn({
      eventId: req.params.eventId,
      userId: req.user!.id,
      ...input,
    });
    res.status(201).json({
      status: "confirmed",
      distanceMeters: Math.round(result.distanceMeters),
      confidence: result.confidence,
      checkedInAt: result.attendance.checkedInAt,
    });
  })
);

const overrideSchema = z.object({ userId: z.string().min(1) });

attendanceRouter.post(
  "/:eventId/override",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { userId } = overrideSchema.parse(req.body);
    const attendance = await attendanceService.manualOverride(req.params.eventId, userId, req.user!.id);
    res.status(201).json(attendance);
  })
);
