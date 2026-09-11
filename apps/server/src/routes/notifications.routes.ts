import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { verifyUnsubscribeToken } from "../utils/unsubscribeToken.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";

export const notificationsRouter = Router();

// Public and unauthenticated by design — a one-click unsubscribe link has
// to work straight out of an email client with no session, on any device,
// whether or not the person is currently signed in anywhere.
notificationsRouter.get(
  "/unsubscribe",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? "");
    const userId = verifyUnsubscribeToken(token);
    if (!userId) {
      return res.redirect(`${env.WEB_ORIGIN}/unsubscribed?status=invalid`);
    }

    await prisma.user.updateMany({ where: { id: userId }, data: { emailNotificationsEnabled: false } });
    res.redirect(`${env.WEB_ORIGIN}/unsubscribed?status=ok`);
  })
);
