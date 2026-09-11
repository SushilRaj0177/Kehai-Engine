import crypto from "node:crypto";
import { env } from "../config/env.js";

// Deliberately not a JWT with an expiry — an unsubscribe link in someone's
// inbox needs to still work whenever they finally get around to clicking
// it, weeks or months later, with no login required. A plain HMAC over the
// userId is enough: it can't be forged without JWT_ACCESS_SECRET, and it
// never expires because there's nothing time-sensitive being asserted.
export function signUnsubscribeToken(userId: string): string {
  const mac = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [userId, mac] = token.split(".");
  if (!userId || !mac) return null;
  const expected = crypto.createHmac("sha256", env.JWT_ACCESS_SECRET).update(userId).digest("hex");
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  return userId;
}
