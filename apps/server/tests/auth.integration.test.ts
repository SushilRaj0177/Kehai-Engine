import { afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import * as authService from "../src/services/auth.service.js";
import { HttpError } from "../src/lib/http-error.js";

/**
 * Integration tests against a real Postgres database, covering the two
 * things this session's auth changes need to hold: refresh no longer
 * rotates (so an interrupted/duplicated refresh never strands a valid
 * session), and password reset revokes every refresh token for the user.
 */

const email = `auth-test-${crypto.randomUUID()}@example.com`;
let userId: string;

afterAll(async () => {
  if (userId) {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
});

describe("auth session lifecycle", () => {
  it("registers and returns a usable session", async () => {
    const result = await authService.register({ name: "Auth Test", email, password: "correct-horse-1" });
    userId = result.user.id;
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it("refresh does not rotate — the same refresh token works repeatedly", async () => {
    const login1 = await authService.login({ email, password: "correct-horse-1" });

    const refresh1 = await authService.refreshSession(login1.refreshToken);
    expect(refresh1.refreshToken).toBe(login1.refreshToken);
    expect(refresh1.accessToken).toBeTruthy();

    // The same token must still work a second time — this is exactly the
    // "reload the page a few times" scenario that used to strand users
    // logged out.
    const refresh2 = await authService.refreshSession(login1.refreshToken);
    expect(refresh2.refreshToken).toBe(login1.refreshToken);
    expect(refresh2.accessToken).toBeTruthy();
  });

  it("logout revokes the refresh token", async () => {
    const login = await authService.login({ email, password: "correct-horse-1" });
    await authService.logout(login.refreshToken);
    await expect(authService.refreshSession(login.refreshToken)).rejects.toThrow(HttpError);
  });

  it("password reset changes the password and revokes all sessions", async () => {
    const login = await authService.login({ email, password: "correct-horse-1" });

    await authService.requestPasswordReset(email);
    const stored = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // We only ever stored the hash — recover the raw token isn't possible,
    // so instead assert the request created exactly the row we expect and
    // exercise resetPassword's own validation (expired/used/unknown token)
    // plus its revoke-everything side effect via a token we mint the same
    // way the service does internally.
    expect(stored.usedAt).toBeNull();
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Reset using an unknown token must fail without touching anything.
    await expect(authService.resetPassword("not-a-real-token", "new-password-1")).rejects.toThrow(HttpError);

    // Directly drive resetPassword with a token we control end-to-end,
    // mirroring exactly what requestPasswordReset does internally.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const { hashToken } = await import("../src/utils/tokens.js");
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60_000) },
    });

    await authService.resetPassword(rawToken, "new-password-1");

    // Old password no longer works, new one does.
    await expect(authService.login({ email, password: "correct-horse-1" })).rejects.toThrow(HttpError);
    const relogin = await authService.login({ email, password: "new-password-1" });
    expect(relogin.accessToken).toBeTruthy();

    // The pre-reset session must be dead — that's the whole point.
    await expect(authService.refreshSession(login.refreshToken)).rejects.toThrow(HttpError);

    // The token can't be reused.
    await expect(authService.resetPassword(rawToken, "another-password-1")).rejects.toThrow(HttpError);
  });
});
