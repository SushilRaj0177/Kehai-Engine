import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

/**
 * Event QR tokens are short-lived, signed JWTs — not permanent identifiers.
 *
 * Each event has its own signing secret (`Event.qrSecret`, combined with a
 * global pepper) so a leaked token for one event can't be replayed against
 * another, and revoking an event's QR (`qrRevoked`) instantly invalidates
 * every token issued for it. The organizer's display rotates the *displayed*
 * QR image every `qrRotationSeconds` (default 20s) by re-requesting a fresh
 * token from the server, so a screenshot of the code goes stale quickly.
 *
 * This is defense in depth around the real control — the geofence check —
 * not a claim of unforgeable proof-of-presence. A screenshotted QR sent to
 * a remote friend still has to pass geolocation verification to produce a
 * valid check-in.
 */

export interface QrTokenPayload {
  jti: string;
  eventId: string;
  typ: "attendance_qr";
}

function eventSigningSecret(eventId: string, qrSecret: string): string {
  return `${env.QR_SIGNING_PEPPER}:${eventId}:${qrSecret}`;
}

export function issueQrToken(eventId: string, qrSecret: string, ttlSeconds: number): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = nanoid(21);
  const secret = eventSigningSecret(eventId, qrSecret);
  const token = jwt.sign({ eventId, typ: "attendance_qr" } as Omit<QrTokenPayload, "jti">, secret, {
    jwtid: jti,
    expiresIn: ttlSeconds,
  });
  return { token, jti, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
}

export function verifyQrToken(token: string, eventId: string, qrSecret: string): QrTokenPayload {
  const secret = eventSigningSecret(eventId, qrSecret);
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  if (decoded.typ !== "attendance_qr" || decoded.eventId !== eventId || !decoded.jti) {
    throw new Error("Malformed QR token");
  }
  return { jti: decoded.jti, eventId: decoded.eventId, typ: "attendance_qr" };
}
