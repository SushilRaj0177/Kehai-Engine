import { afterAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createOrganization, deleteOrganization } from "../src/services/org.service.js";
import { createEvent } from "../src/services/event.service.js";
import { deleteAccount } from "../src/services/auth.service.js";

const cleanupUserIds: string[] = [];
const cleanupOrgIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: cleanupOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
  await prisma.$disconnect();
});

async function makeOwner() {
  const user = await prisma.user.create({
    data: { name: "Org Deleter", email: `deleteorg-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  cleanupUserIds.push(user.id);
  return user;
}

describe("deleting an organization", () => {
  it("deletes a clean organization with no active events, cascading its events and memberships", async () => {
    const owner = await makeOwner();
    const org = await createOrganization(owner.id, "Deletable Org " + crypto.randomUUID());
    const event = await createEvent(org.id, owner.id, {
      name: "Cascade Test Event",
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

    await deleteOrganization(org.id);

    const orgFound = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(orgFound).toBeNull();
    const eventFound = await prisma.event.findUnique({ where: { id: event.id } });
    expect(eventFound).toBeNull();
    const membershipFound = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    });
    expect(membershipFound).toBeNull();
  });

  it("rejects deletion while an event under the org is ACTIVE", async () => {
    const owner = await makeOwner();
    const org = await createOrganization(owner.id, "Active Blocked Org " + crypto.randomUUID());
    cleanupOrgIds.push(org.id);
    const event = await createEvent(org.id, owner.id, {
      name: "Live Blocker Event",
      venue: "Test Venue",
      startsAt: new Date(Date.now() - 60 * 60_000),
      endsAt: new Date(Date.now() + 60 * 60_000),
      attendanceOpensMinutesBefore: 30,
      attendanceClosesMinutesAfter: 30,
      latitude: 0,
      longitude: 0,
      geofenceRadiusM: 100,
      qrRotationSeconds: 20,
    } as any);
    await prisma.event.update({ where: { id: event.id }, data: { status: "ACTIVE" } });

    await expect(deleteOrganization(org.id)).rejects.toThrow(/is active/i);

    const stillThere = await prisma.organization.findUnique({ where: { id: org.id } });
    expect(stillThere).not.toBeNull();
  });

  it("unblocks account deletion once the sole-owned org is deleted", async () => {
    const owner = await makeOwner();
    const org = await createOrganization(owner.id, "Unblock Deletion Org " + crypto.randomUUID());

    await expect(deleteAccount(owner.id, undefined)).rejects.toThrow(/only owner/i);

    await deleteOrganization(org.id);
    await deleteAccount(owner.id, undefined);

    const userFound = await prisma.user.findUnique({ where: { id: owner.id } });
    expect(userFound).toBeNull();
    cleanupUserIds.splice(cleanupUserIds.indexOf(owner.id), 1);
  });
});
