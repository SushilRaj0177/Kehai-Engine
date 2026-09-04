import { Router } from "express";
import QRCode from "qrcode";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import * as eventService from "../services/event.service.js";
import { env } from "../config/env.js";

export const qrRouter = Router();

/** Returns a fresh rotating check-in QR as a PNG data URL, ready for <img src>. */
qrRouter.get(
  "/events/:eventId/qr-image",
  requireAuth,
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const { token, expiresAt, rotationSeconds } = await eventService.issueEventQr(req.params.eventId);
    const deepLink = `${env.WEB_ORIGIN}/attend/${req.params.eventId}?t=${encodeURIComponent(token)}`;
    const dataUrl = await QRCode.toDataURL(deepLink, { margin: 1, width: 480, color: { dark: "#0a0e14", light: "#ffffff" } });
    res.json({ dataUrl, expiresAt, rotationSeconds });
  })
);
