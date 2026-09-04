import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import * as exportService from "../services/export.service.js";

export const exportRouter = Router();

exportRouter.get(
  "/events/:eventId/attendees.csv",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { filename, content } = await exportService.exportAttendeesCsv(req.params.eventId);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  })
);

exportRouter.get(
  "/events/:eventId/attendees.xlsx",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { filename, buffer } = await exportService.exportAttendeesExcel(req.params.eventId);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);
