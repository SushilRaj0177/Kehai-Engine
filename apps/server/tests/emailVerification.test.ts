import { afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { register, verifyEmail, resendVerificationEmail } from "../src/services/auth.service.js";
import { hashToken } from "../src/utils/tokens.js";

const cleanupUserIds: string[] = [];

afterAll(async () => {
  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: cleanupUserIds } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: cleanupUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
  await prisma.$disconnect();
});

describe("email verification", () => {
  it("registering a PASSWORD account leaves emailVerifiedAt null and creates a token", async () => {
    const email = `verify-test-${crypto.randomUUID()}@example.com`;
    const result = await register({ name: "Verify Test", email, password: "correct-horse-1" });
    cleanupUserIds.push(result.user.id);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
    expect(user.emailVerifiedAt).toBeNull();

    const tokenCount = await prisma.emailVerificationToken.count({ where: { userId: result.user.id } });
    expect(tokenCount).toBe(1);
  });

  it("verifying with the correct raw token sets emailVerifiedAt and consumes the token", async () => {
    const email = `verify-flow-${crypto.randomUUID()}@example.com`;
    const result = await register({ name: "Verify Flow", email, password: "correct-horse-1" });
    cleanupUserIds.push(result.user.id);

    // register() only emails the raw token, never returns it — mint our
    // own and store its hash directly, exactly what sendVerificationEmail
    // does internally, to drive verifyEmail() with a known raw token.
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { userId: result.user.id } });
    await prisma.emailVerificationToken.create({
      data: { userId: result.user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60_000) },
    });

    await verifyEmail(rawToken);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
    expect(user.emailVerifiedAt).not.toBeNull();

    await expect(verifyEmail(rawToken)).rejects.toThrow(/invalid or has expired/i);
  });

  it("rejects an expired token", async () => {
    const email = `verify-expired-${crypto.randomUUID()}@example.com`;
    const result = await register({ name: "Verify Expired", email, password: "correct-horse-1" });
    cleanupUserIds.push(result.user.id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.deleteMany({ where: { userId: result.user.id } });
    await prisma.emailVerificationToken.create({
      data: { userId: result.user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(verifyEmail(rawToken)).rejects.toThrow(/invalid or has expired/i);
  });

  it("rejects a garbage token", async () => {
    await expect(verifyEmail("not-a-real-token")).rejects.toThrow(/invalid or has expired/i);
  });

  it("resend creates a fresh token for an unverified user", async () => {
    const email = `verify-resend-${crypto.randomUUID()}@example.com`;
    const result = await register({ name: "Verify Resend", email, password: "correct-horse-1" });
    cleanupUserIds.push(result.user.id);

    const before = await prisma.emailVerificationToken.count({ where: { userId: result.user.id } });
    await resendVerificationEmail(result.user.id);
    const after = await prisma.emailVerificationToken.count({ where: { userId: result.user.id } });
    expect(after).toBe(before + 1);
  });

  it("rejects resend for an already-verified user", async () => {
    const email = `verify-already-${crypto.randomUUID()}@example.com`;
    const result = await register({ name: "Verify Already", email, password: "correct-horse-1" });
    cleanupUserIds.push(result.user.id);
    await prisma.user.update({ where: { id: result.user.id }, data: { emailVerifiedAt: new Date() } });

    await expect(resendVerificationEmail(result.user.id)).rejects.toThrow(/already verified/i);
  });
});
