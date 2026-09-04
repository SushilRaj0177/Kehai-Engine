import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import * as analyticsService from "../services/analytics.service.js";
import { detectEventAnomalies } from "../services/anomaly.service.js";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/orgs/:orgId/overview",
  requireAuth,
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    res.json(await analyticsService.computeOrgOverview(req.params.orgId));
  })
);

analyticsRouter.get(
  "/events/:eventId",
  requireAuth,
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    res.json(await analyticsService.computeEventAnalytics(req.params.eventId));
  })
);

analyticsRouter.get(
  "/events/:eventId/anomalies",
  requireAuth,
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    const eventAnalytics = await analyticsService.computeEventAnalytics(req.params.eventId);
    const { prisma } = await import("../lib/prisma.js");
    const event = await prisma.event.findUniqueOrThrow({ where: { id: req.params.eventId } });
    const overview = await analyticsService.computeOrgOverview(event.organizationId);
    res.json(detectEventAnomalies(eventAnalytics, overview.events));
  })
);
