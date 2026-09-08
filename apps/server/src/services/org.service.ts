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

export async function inviteMember(organizationId: string, email: string, role: "ADMIN" | "ORGANIZER" | "VIEWER") {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw HttpError.notFound("No user found with that email — they must create an account first");

  return prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    update: { role },
    create: { userId: user.id, organizationId, role },
  });
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
