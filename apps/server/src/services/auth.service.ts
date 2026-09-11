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

const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours — longer-lived than a
// password reset link since there's no urgency and no harm in a stale one.

async function sendVerificationEmail(userId: string, email: string, name: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });

  const link = `${env.WEB_ORIGIN}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendEmail(
    email,
    "Verify your Kehai Engine email",
    `<p>Hi ${name},</p>
     <p>Click the link below to confirm this is your email address. This link expires in 24 hours.</p>
     <p><a href="${link}">${link}</a></p>
     <p>If you didn't create this account, you can safely ignore this email.</p>`
  );
}

export async function register(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw HttpError.conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, provider: "PASSWORD" },
  });

  // Unlike resendVerificationEmail (where sending the email IS the point of
  // the call, so a failure should surface), this is incidental to account
  // creation — a mailer outage shouldn't turn a successful registration
  // into a 500 with the user's account already committed but no session
  // handed back. They can always request a fresh link once mail is back.
  try {
    await sendVerificationEmail(user.id, user.email, user.name);
  } catch (err) {
    console.error("[auth] Failed to send verification email during registration:", err);
  }

  const session = await issueSession(user.id, user.email, user.name);
  return { user: sanitizeUser(user), ...session };
}

export async function resendVerificationEmail(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) throw HttpError.badRequest("This email is already verified");
  await sendVerificationEmail(user.id, user.email, user.name);
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw HttpError.badRequest("This verification link is invalid or has expired — request a new one.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);
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
      // Google has already verified this address, whether or not the
      // existing PASSWORD account ever confirmed it themselves.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleSub: payload.sub,
          provider: "GOOGLE",
          avatarUrl: payload.picture,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name ?? payload.email.split("@")[0],
          googleSub: payload.sub,
          provider: "GOOGLE",
          avatarUrl: payload.picture,
          emailVerifiedAt: new Date(),
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

export async function updateProfile(userId: string, input: { name?: string; emailNotificationsEnabled?: boolean }) {
  return prisma.user.update({ where: { id: userId }, data: input });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash) {
    throw HttpError.badRequest("This account signs in with Google — there's no password to change.");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw HttpError.unauthorized("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Same "changing the password ends every session, everywhere" guarantee
    // as the forgot-password reset flow — including the session making this
    // very request, so the client needs to redirect to login afterward.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

// Deleting a user cascades cleanly through most of the schema (memberships,
// registrations, attendance, refresh tokens, enrollments — all ON DELETE
// CASCADE), but two relations don't: Classroom.teacher is CASCADE too
// (so a taught classroom's entire history would vanish silently, which is
// the one cascade here actually worth blocking on rather than allowing),
// and Event.createdBy has no cascade at all (so it would just throw a raw
// FK-violation instead of the account ever getting deleted). Rather than
// silently wiping a classroom or hard-failing confusingly, refuse deletion
// up front with a plain-language explanation of what to resolve first.
export async function deleteAccount(userId: string, password: string | undefined) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.passwordHash) {
    if (!password) throw HttpError.badRequest("Enter your password to confirm account deletion");
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw HttpError.unauthorized("Password is incorrect");
  }

  const [soleOwnerships, taughtClassrooms, createdEvents] = await Promise.all([
    prisma.membership.findMany({
      where: { userId, role: "OWNER" },
      include: { organization: { select: { name: true, _count: { select: { memberships: { where: { role: "OWNER" } } } } } } },
    }),
    prisma.classroom.count({ where: { teacherId: userId } }),
    prisma.event.count({ where: { createdById: userId } }),
  ]);
  const soleOwnedOrgs = soleOwnerships.filter((m) => m.organization._count.memberships <= 1);

  const blockers: string[] = [];
  if (soleOwnedOrgs.length) {
    blockers.push(
      `you're the only owner of ${soleOwnedOrgs.length === 1 ? soleOwnedOrgs[0].organization.name : `${soleOwnedOrgs.length} organizations`} — transfer ownership or delete ${soleOwnedOrgs.length === 1 ? "it" : "them"} first`
    );
  }
  if (taughtClassrooms > 0) {
    blockers.push(`you teach ${taughtClassrooms} classroom${taughtClassrooms === 1 ? "" : "s"} — delete or hand ${taughtClassrooms === 1 ? "it" : "them"} off first`);
  }
  if (createdEvents > 0) {
    blockers.push(`you created ${createdEvents} event${createdEvents === 1 ? "" : "s"} — delete ${createdEvents === 1 ? "it" : "them"} first`);
  }
  if (blockers.length) {
    throw HttpError.badRequest(`Can't delete your account yet: ${blockers.join("; ")}.`);
  }

  await prisma.user.delete({ where: { id: userId } });
}
