import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createOrganization, inviteMember, removeMember } from "../src/services/org.service.js";

let orgId: string;
let ownerId: string;
let adminId: string;
let organizerId: string;

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: { name: "Org Owner", email: `org-owner-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  ownerId = owner.id;

  const org = await createOrganization(ownerId, "Membership Test Org " + crypto.randomUUID());
  orgId = org.id;

  const admin = await prisma.user.create({
    data: { name: "Org Admin", email: `org-admin-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  adminId = admin.id;
  await inviteMember(orgId, admin.email, "ADMIN");

  const organizer = await prisma.user.create({
    data: { name: "Org Organizer", email: `org-organizer-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  organizerId = organizer.id;
  await inviteMember(orgId, organizer.email, "ORGANIZER");
});

afterAll(async () => {
  await prisma.membership.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, adminId, organizerId] } } });
  await prisma.$disconnect();
});

describe("removing an organization member", () => {
  it("rejects removing yourself", async () => {
    await expect(removeMember(orgId, ownerId, ownerId, "OWNER")).rejects.toThrow(/remove yourself/i);
  });

  it("rejects an ADMIN removing another ADMIN (equal role)", async () => {
    const secondAdmin = await prisma.user.create({
      data: { name: "Second Admin", email: `second-admin-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await inviteMember(orgId, secondAdmin.email, "ADMIN");

    await expect(removeMember(orgId, secondAdmin.id, adminId, "ADMIN")).rejects.toThrow(/equal or higher role/i);

    await prisma.membership.deleteMany({ where: { organizationId: orgId, userId: secondAdmin.id } });
    await prisma.user.delete({ where: { id: secondAdmin.id } });
  });

  it("rejects removing the last owner", async () => {
    await expect(removeMember(orgId, ownerId, adminId, "ADMIN")).rejects.toThrow(/equal or higher role/i);
  });

  it("lets an ADMIN remove an ORGANIZER", async () => {
    await removeMember(orgId, organizerId, adminId, "ADMIN");
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: organizerId, organizationId: orgId } },
    });
    expect(membership).toBeNull();
  });

  it("rejects removing someone who isn't a member", async () => {
    const stranger = await prisma.user.create({
      data: { name: "Stranger", email: `org-stranger-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await expect(removeMember(orgId, stranger.id, ownerId, "OWNER")).rejects.toThrow(/isn't a member/i);
    await prisma.user.delete({ where: { id: stranger.id } });
  });
});
