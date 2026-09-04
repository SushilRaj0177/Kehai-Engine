import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import { aiRateLimit } from "../middleware/rateLimit.js";
import { getEventInsights } from "../ai/insights.service.js";
import { answerOrgQuestion, generatePostEventReport } from "../ai/nlQuery.service.js";
import { aiEnabled } from "../ai/provider.js";

export const aiRouter = Router();

aiRouter.get("/status", (_req, res) => res.json({ enabled: aiEnabled }));

aiRouter.get(
  "/events/:eventId/insights",
  requireAuth,
  requireOrgRole("VIEWER"),
  aiRateLimit,
  asyncHandler(async (req, res) => {
    res.json(await getEventInsights(req.params.eventId));
  })
);

aiRouter.get(
  "/events/:eventId/report",
  requireAuth,
  requireOrgRole("VIEWER"),
  aiRateLimit,
  asyncHandler(async (req, res) => {
    res.json(await generatePostEventReport(req.params.eventId));
  })
);

const askSchema = z.object({ question: z.string().trim().min(3).max(500) });

aiRouter.post(
  "/orgs/:orgId/ask",
  requireAuth,
  requireOrgRole("VIEWER"),
  aiRateLimit,
  asyncHandler(async (req, res) => {
    const { question } = askSchema.parse(req.body);
    res.json(await answerOrgQuestion(req.params.orgId, question));
  })
);
