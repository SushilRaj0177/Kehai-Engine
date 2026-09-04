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

export async function listOrgEvents(organizationId: string) {
  return prisma.event.findMany({
    where: { organizationId },
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { registrations: true, attendances: true } } },
  });
}
