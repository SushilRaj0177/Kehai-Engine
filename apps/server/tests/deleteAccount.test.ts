import { afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { deleteAccount } from "../src/services/auth.service.js";
import { createOrganization } from "../src/services/org.service.js";
import { createEvent } from "../src/services/event.service.js";
import { createClassroom } from "../src/services/classroom.service.js";

const cleanupUserIds: string[] = [];
const cleanupOrgIds: string[] = [];

afterAll(async () => {
  await prisma.classroom.deleteMany({ where: { teacherId: { in: cleanupUserIds } } });
  await prisma.event.deleteMany({ where: { createdById: { in: cleanupUserIds } } });
  await prisma.membership.deleteMany({ where: { organizationId: { in: cleanupOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: cleanupOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
  await prisma.$disconnect();
});

async function makeUser(label: string, withPassword = true) {
  const passwordHash = withPassword ? await bcrypt.hash("correct-horse-1", 12) : null;
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `delacct-${label}-${crypto.randomUUID()}@example.com`,
      provider: withPassword ? "PASSWORD" : "GOOGLE",
      passwordHash,
    },
  });
  cleanupUserIds.push(user.id);
  return user;
}

describe("deleting an account", () => {
  it("rejects a missing password for a password-based account", async () => {
    const user = await makeUser("no-pw-given");
    await expect(deleteAccount(user.id, undefined)).rejects.toThrow(/enter your password/i);
  });

  it("rejects an incorrect password", async () => {
    const user = await makeUser("wrong-pw");
    await expect(deleteAccount(user.id, "totally-wrong")).rejects.toThrow(/incorrect/i);
  });

  it("deletes a clean account with no blockers", async () => {
    const user = await makeUser("clean");
    await deleteAccount(user.id, "correct-horse-1");
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found).toBeNull();
    cleanupUserIds.splice(cleanupUserIds.indexOf(user.id), 1); // already gone
  });

  it("deletes a Google-only account without requiring a password", async () => {
    const user = await makeUser("google-only", false);
    await deleteAccount(user.id, undefined);
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found).toBeNull();
    cleanupUserIds.splice(cleanupUserIds.indexOf(user.id), 1);
  });

  it("blocks deletion when the user is the sole owner of an organization", async () => {
    const user = await makeUser("sole-owner");
    const org = await createOrganization(user.id, "Sole Owner Test Org " + crypto.randomUUID());
    cleanupOrgIds.push(org.id);

    await expect(deleteAccount(user.id, "correct-horse-1")).rejects.toThrow(/only owner/i);
  });

  it("allows deletion when the user owns an org alongside another owner", async () => {
    const user = await makeUser("co-owner");
    const otherOwner = await makeUser("other-owner");
    const org = await createOrganization(user.id, "Co-Owned Test Org " + crypto.randomUUID());
    cleanupOrgIds.push(org.id);
    await prisma.membership.create({ data: { organizationId: org.id, userId: otherOwner.id, role: "OWNER" } });

    await deleteAccount(user.id, "correct-horse-1");
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found).toBeNull();
    cleanupUserIds.splice(cleanupUserIds.indexOf(user.id), 1);
  });

  it("blocks deletion when the user teaches a classroom", async () => {
    const user = await makeUser("teacher");
    await createClassroom(user.id, { name: "Blocker Test Classroom" });

    await expect(deleteAccount(user.id, "correct-horse-1")).rejects.toThrow(/teach 1 classroom/i);
  });

  it("blocks deletion when the user created an event", async () => {
    const user = await makeUser("event-creator");
    const org = await createOrganization(user.id, "Event Creator Test Org " + crypto.randomUUID());
    cleanupOrgIds.push(org.id);
    await createEvent(org.id, user.id, {
      name: "Blocker Test Event",
      venue: "Test Venue",
      startsAt: new Date(Date.now() + 60 * 60_000),
      endsAt: new Date(Date.now() + 2 * 60 * 60_000),
      attendanceOpensMinutesBefore: 30,
      attendanceClosesMinutesAfter: 30,
      latitude: 0,
      longitude: 0,
      geofenceRadiusM: 100,
      qrRotationSeconds: 20,
    } as any);

    await expect(deleteAccount(user.id, "correct-horse-1")).rejects.toThrow(/created 1 event/i);
  });
});
