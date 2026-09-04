import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { env, googleAuthEnabled } from "../config/env.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

const googleClient = googleAuthEnabled ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

async function issueSession(userId: string, email: string, name: string) {
  const accessToken = signAccessToken({ sub: userId, email, name });
  const refreshToken = signRefreshToken(userId);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
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

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const session = await issueSession(user.id, user.email, user.name);
  return { user: sanitizeUser(user), ...session };
}

export async function logout(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function sanitizeUser(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}
