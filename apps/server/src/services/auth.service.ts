import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { env, googleAuthEnabled } from "../config/env.js";
import { sendEmail } from "../utils/mailer.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

const googleClient = googleAuthEnabled ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// A refresh token's DB row stays valid for this long since it was last
// used (sliding window) — see refreshSession's comment below for why it's
// never rotated, just slid forward.
const REFRESH_TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

async function issueSession(userId: string, email: string, name: string) {
  const accessToken = signAccessToken({ sub: userId, email, name });
  const refreshToken = signRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
    },
  });
  return { accessToken, refreshToken };
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, provider: "PASSWORD" },
  });

  const session = await issueSession(user.id, user.email, user.name);
  return { user: sanitizeUser(user), ...session };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.passwordHash) {
    throw HttpError.unauthorized("Invalid email or password");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw HttpError.unauthorized("Invalid email or password");

  const session = await issueSession(user.id, user.email, user.name);
  return { user: sanitizeUser(user), ...session };
}

export async function loginWithGoogle(idToken: string) {
  if (!googleClient) throw HttpError.badRequest("Google sign-in is not configured on this server");

  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw HttpError.unauthorized("Invalid Google token");

  let user = await prisma.user.findUnique({ where: { googleSub: payload.sub } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: payload.sub, provider: "GOOGLE", avatarUrl: payload.picture },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email.split("@")[0],
          googleSub: payload.sub,
          provider: "GOOGLE",
          avatarUrl: payload.picture,
        },
      });
    }
  }

  const session = await issueSession(user.id, user.email, user.name);
  return { user: sanitizeUser(user), ...session };
}

// Deliberately does NOT rotate the refresh token. Rotating on every use
// means the token the client is holding is only ever valid once — any
// interrupted request (a page reload mid-refresh, two tabs both refreshing
// near-simultaneously) leaves the client holding a token the server has
// already invalidated, forcing a real logout for no actual security gain.
// The refresh token instead behaves like a proper persistent session: it
// stays valid, sliding its expiry forward on each use, until the user
// explicitly logs out (logout() below) or resets their password
// (resetPassword() revokes every one of the user's refresh tokens).
export async function refreshSession(refreshToken: string) {
  let decoded: { sub: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw HttpError.unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw HttpError.unauthorized("Refresh token no longer valid");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user) throw HttpError.unauthorized("User no longer exists");

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS) },
  });

  const accessToken = signAccessToken({ sub: user.id, email: user.email, name: user.name });
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour

// Always resolves with no indication of whether the email matched an
// account, a Google-only account, or nothing at all — a different
// response for each would let an attacker enumerate registered emails.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Nothing to reset for a Google-only account (no passwordHash) — silently
  // no-op, same as the "no such user" case, for the same enumeration reason.
  if (!user || !user.passwordHash) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const link = `${env.WEB_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendEmail(
    user.email,
    "Reset your Kehai Engine password",
    `<p>Hi ${user.name},</p>
     <p>Click the link below to set a new password. This link expires in 1 hour and can only be used once.</p>
     <p><a href="${link}">${link}</a></p>
     <p>If you didn't request this, you can safely ignore this email.</p>`
  );
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw HttpError.badRequest("This reset link is invalid or has expired — request a new one.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Changing the password ends every existing session, everywhere —
    // the same "until they log out or change their password" guarantee
    // the persistent-login redesign above promises.
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

function sanitizeUser(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}
