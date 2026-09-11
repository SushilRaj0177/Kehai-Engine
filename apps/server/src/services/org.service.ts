import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/http-error.js";
import { slugify } from "../validators/org.js";

export async function createOrganization(ownerId: string, name: string) {
  const base = slugify(name) || "org";
  let slug = base;
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${++suffix}`;
  }

  return prisma.organization.create({
    data: {
      name,
      slug,
      memberships: { create: { userId: ownerId, role: "OWNER" } },
    },
  });
}

// Cascades through every event, membership, and audit log the org owns
// (see schema.prisma — all ON DELETE CASCADE from Organization), so this is
// the one place a user with a sole ownership blocking their own account
// deletion can actually clear that blocker. Same "not while something's
// live" guard as deleteEvent, for the same reason: an ACTIVE event usually
// means people are mid check-in right now.
export async function deleteOrganization(organizationId: string) {
  const activeEvent = await prisma.event.findFirst({ where: { organizationId, status: "ACTIVE" } });
  if (activeEvent) {
    throw HttpError.badRequest(`Cannot delete this organization while "${activeEvent.name}" is active — cancel or complete it first`);
  }
  await prisma.organization.delete({ where: { id: organizationId } });
}

export async function inviteMember(
  organizationId: string,
  email: string,
  role: "ADMIN" | "ORGANIZER" | "VIEWER",
  callerRole: "OWNER" | "ADMIN"
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw HttpError.notFound("No user found with that email — they must create an account first");

  // An ADMIN can only ever *grant* up to ADMIN (see inviteMemberSchema), but
  // without this check they could still re-invite an existing OWNER at a
  // lower role and silently demote them — the same privilege-escalation
  // concern removeMember already guards against, just via upsert instead of
  // delete.
  if (callerRole === "ADMIN") {
    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (existing && existing.role === "OWNER") {
      throw HttpError.forbidden("You can't change an owner's role");
    }
  }

  return prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    update: { role },
    create: { userId: user.id, organizationId, role },
  });
}

const ROLE_RANK: Record<"VIEWER" | "ORGANIZER" | "ADMIN" | "OWNER", number> = {
  VIEWER: 0,
  ORGANIZER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export async function removeMember(organizationId: string, userId: string, callerId: string, callerRole: keyof typeof ROLE_RANK) {
  if (userId === callerId) throw HttpError.badRequest("You can't remove yourself from an organization here");

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership) throw HttpError.notFound("This person isn't a member of this organization");

  // An ADMIN can invite up to ADMIN (see inviteMemberSchema) but must not be
  // able to remove a peer or superior — that would let an ADMIN unilaterally
  // shrink the org's leadership, which only an OWNER should be able to do.
  // OWNER-removing-OWNER is the one same-rank case that's allowed through —
  // otherwise the last-owner check below could never be reached by anyone,
  // since no role outranks OWNER.
  const sameRankButBothOwners = callerRole === "OWNER" && membership.role === "OWNER";
  if (ROLE_RANK[membership.role] >= ROLE_RANK[callerRole] && !sameRankButBothOwners) {
    throw HttpError.forbidden("You can't remove a member with an equal or higher role than your own");
  }

  // An org with no OWNER left has nobody able to manage its other members'
  // roles — removing the last one would strand the organization rather than
  // just shrink its team.
  if (membership.role === "OWNER") {
    const ownerCount = await prisma.membership.count({ where: { organizationId, role: "OWNER" } });
    if (ownerCount <= 1) throw HttpError.badRequest("An organization must keep at least one owner");
  }

  await prisma.membership.delete({ where: { id: membership.id } });

  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: callerId,
      action: "member.removed",
      metadata: { removedUserId: userId, removedRole: membership.role },
    },
  });
}

export async function getAuditLog(organizationId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { id: true, name: true, email: true } },
      event: { select: { id: true, name: true } },
    },
  });
  return entries;
}

// Plain "newest first" buried the one event an organizer most likely opened
// this page to check — a live event needing attention — beneath any
// further-future draft or published event, since a draft scheduled for
// next month sorts above something happening right now. Rank by how much
// the event actually needs eyes on it first, then by time within that rank:
// soonest-next for anything still ahead, most-recently-ended for history.
const ORG_EVENT_STATUS_RANK: Record<string, number> = {
  ACTIVE: 0,
  PUBLISHED: 1,
  DRAFT: 2,
  COMPLETED: 3,
  CANCELLED: 4,
};

export async function listOrgEvents(organizationId: string) {
  const events = await prisma.event.findMany({
    where: { organizationId },
    include: { _count: { select: { registrations: true, attendances: true } } },
  });

  return events.sort((a, b) => {
    const rankDiff = ORG_EVENT_STATUS_RANK[a.status] - ORG_EVENT_STATUS_RANK[b.status];
    if (rankDiff !== 0) return rankDiff;
    const isPast = a.status === "COMPLETED" || a.status === "CANCELLED";
    return isPast ? b.startsAt.getTime() - a.startsAt.getTime() : a.startsAt.getTime() - b.startsAt.getTime();
  });
}
