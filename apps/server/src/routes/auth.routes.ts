import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  registerSchema,
  googleAuthSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.js";
import * as authService from "../services/auth.service.js";
import { prisma } from "../lib/prisma.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.json(result);
  })
);

authRouter.post(
  "/google",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = googleAuthSchema.parse(req.body);
    const result = await authService.loginWithGoogle(input.idToken);
    res.json(result);
  })
);

authRouter.post(
  "/refresh",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    const result = await authService.refreshSession(input.refreshToken);
    res.json(result);
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const input = refreshSchema.parse(req.body);
    await authService.logout(input.refreshToken);
    res.status(204).end();
  })
);

authRouter.post(
  "/forgot-password",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.requestPasswordReset(input.email);
    // Always 200, regardless of whether the email matched an account —
    // see requestPasswordReset's own comment on why.
    res.status(200).json({ status: "ok" });
  })
);

authRouter.post(
  "/reset-password",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input.token, input.password);
    res.status(200).json({ status: "ok" });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: { organization: true },
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
      },
      memberships: memberships.map((m) => ({
        role: m.role,
        organization: { id: m.organization.id, name: m.organization.name, slug: m.organization.slug },
      })),
    });
  })
);

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.user!.id, input);
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    });
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(204).end();
  })
);
