import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
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

export function issueClassQrToken(sessionId: string, qrSecret: string, ttlSeconds: number): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = nanoid(21);
  const secret = classSigningSecret(sessionId, qrSecret);
  const token = jwt.sign({ sessionId, typ: "class_qr" } as Omit<ClassQrTokenPayload, "jti">, secret, {
    jwtid: jti,
    expiresIn: ttlSeconds,
  });
  return { token, jti, expiresAt: new Date(Date.now() + ttlSeconds * 1000) };
}

export function verifyClassQrToken(token: string, sessionId: string, qrSecret: string): ClassQrTokenPayload {
  const secret = classSigningSecret(sessionId, qrSecret);
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  if (decoded.typ !== "class_qr" || decoded.sessionId !== sessionId || !decoded.jti) {
    throw new Error("Malformed QR token");
  }
  return { jti: decoded.jti, sessionId: decoded.sessionId, typ: "class_qr" };
}
