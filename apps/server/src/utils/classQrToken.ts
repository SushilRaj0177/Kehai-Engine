import jwt from "jsonwebtoken";
import { graceSeconds, windowJti, type QrWindow } from "./qrWindow.js";
import { env } from "../config/env.js";

/**
 * Classroom check-in QR tokens are short-lived, signed JWTs — not permanent
 * identifiers. Mirrors utils/qrToken.ts's structure exactly, namespaced for
 * class sessions instead of events.
 *
 * Each class session has its own signing secret (`ClassSession.qrSecret`,
 * combined with a global pepper) so a leaked token for one session can't be
 * replayed against another. The teacher's display rotates the *displayed*
 * QR image every `qrRotationSeconds` (default 20s) by re-requesting a fresh
 * token from the server, so a screenshot of the code goes stale quickly.
 *
 * This is defense in depth around the real control — the optional geofence
 * check — not a claim of unforgeable proof-of-presence.
 */

export interface ClassQrTokenPayload {
  jti: string;
  sessionId: string;
  typ: "class_qr";
}

function classSigningSecret(sessionId: string, qrSecret: string): string {
  return `${env.QR_SIGNING_PEPPER}:${sessionId}:${qrSecret}`;
}

export function issueClassQrToken(sessionId: string, qrSecret: string, window: QrWindow, rotationSeconds: number): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const secret = classSigningSecret(sessionId, qrSecret);
  const jti = windowJti(secret, window.index);
  const iat = Math.floor(window.startsAt.getTime() / 1000);
  const exp = Math.floor(window.rotatesAt.getTime() / 1000) + graceSeconds(rotationSeconds);
  // Explicit iat/exp + a window-derived jti: HS256 over identical input is
  // byte-identical, so every request in this window returns the same token.
  const token = jwt.sign({ sessionId, typ: "class_qr", jti, iat, exp }, secret, { noTimestamp: true });
  return { token, jti, expiresAt: new Date(exp * 1000) };
}

export function verifyClassQrToken(token: string, sessionId: string, qrSecret: string): ClassQrTokenPayload {
  const secret = classSigningSecret(sessionId, qrSecret);
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  if (decoded.typ !== "class_qr" || decoded.sessionId !== sessionId || !decoded.jti) {
    throw new Error("Malformed QR token");
  }
  return { jti: decoded.jti, sessionId: decoded.sessionId, typ: "class_qr" };
}
