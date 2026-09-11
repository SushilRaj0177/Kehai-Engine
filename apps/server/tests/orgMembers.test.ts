import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createOrganization, inviteMember, removeMember, getAuditLog } from "../src/services/org.service.js";

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
  await inviteMember(orgId, admin.email, "ADMIN", "OWNER");

  const organizer = await prisma.user.create({
    data: { name: "Org Organizer", email: `org-organizer-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  organizerId = organizer.id;
  await inviteMember(orgId, organizer.email, "ORGANIZER", "OWNER");
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
    await inviteMember(orgId, secondAdmin.email, "ADMIN", "OWNER");

    await expect(removeMember(orgId, secondAdmin.id, adminId, "ADMIN")).rejects.toThrow(/equal or higher role/i);

    await prisma.membership.deleteMany({ where: { organizationId: orgId, userId: secondAdmin.id } });
    await prisma.user.delete({ where: { id: secondAdmin.id } });
  });

  it("rejects an ADMIN removing an OWNER", async () => {
    await expect(removeMember(orgId, ownerId, adminId, "ADMIN")).rejects.toThrow(/equal or higher role/i);
  });

  it("lets an OWNER remove another OWNER when more than one owner exists", async () => {
    const secondOwner = await prisma.user.create({
      data: { name: "Second Owner", email: `second-owner-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await inviteMember(orgId, secondOwner.email, "ADMIN", "OWNER");
    await prisma.membership.update({
      where: { userId_organizationId: { userId: secondOwner.id, organizationId: orgId } },
      data: { role: "OWNER" },
    });

    await removeMember(orgId, secondOwner.id, ownerId, "OWNER");
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: secondOwner.id, organizationId: orgId } },
    });
    expect(membership).toBeNull();

    await prisma.user.delete({ where: { id: secondOwner.id } });
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

describe("inviting an organization member", () => {
  it("rejects an ADMIN re-inviting an existing OWNER at a lower role", async () => {
    await expect(inviteMember(orgId, "org-owner-does-not-matter@example.com", "ADMIN", "ADMIN")).rejects.toThrow(/no user found/i);

    // Real case: re-inviting the actual owner's email.
    const ownerUser = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    await expect(inviteMember(orgId, ownerUser.email, "ADMIN", "ADMIN")).rejects.toThrow(/change an owner's role/i);

    const stillOwner = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: ownerId, organizationId: orgId } },
    });
    expect(stillOwner?.role).toBe("OWNER");
  });

  it("lets an OWNER change another member's role via re-invite", async () => {
    const membership = await inviteMember(orgId, (await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).email, "VIEWER", "OWNER");
    expect(membership.role).toBe("VIEWER");

    // restore for other tests' sake
    await prisma.membership.update({
      where: { userId_organizationId: { userId: adminId, organizationId: orgId } },
      data: { role: "ADMIN" },
    });
  });
});

describe("organization audit log", () => {
  it("records a member.removed entry with the acting user and the removed role", async () => {
    const removable = await prisma.user.create({
      data: { name: "Audited Removal", email: `audited-removal-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
    });
    await inviteMember(orgId, removable.email, "VIEWER", "OWNER");
    await removeMember(orgId, removable.id, ownerId, "OWNER");

    const log = await getAuditLog(orgId);
    const entry = log.find((e) => e.action === "member.removed" && (e.metadata as any)?.removedUserId === removable.id);
    expect(entry).toBeTruthy();
    expect(entry?.actor?.id).toBe(ownerId);
    expect((entry?.metadata as any)?.removedRole).toBe("VIEWER");

    await prisma.auditLog.deleteMany({ where: { organizationId: orgId, action: "member.removed" } });
    await prisma.user.delete({ where: { id: removable.id } });
  });
});
