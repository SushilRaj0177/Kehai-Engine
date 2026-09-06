import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  name: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as any });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  // A JWT's claims plus its expiry are otherwise identical for the same
  // user signed twice within the same second (jsonwebtoken's exp/iat only
  // have second-level granularity) — two near-simultaneous logins (or
  // logging in, out, and back in fast) would then produce the exact same
  // token string, colliding on the stored tokenHash's unique constraint.
  // A random jti guarantees every issued token is distinct regardless of
  // timing.
  return jwt.sign({ sub: userId, typ: "refresh", jti: crypto.randomBytes(16).toString("hex") }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as any,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
