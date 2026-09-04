import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { requireAuth, requireOrgRole } from "../middleware/auth.js";
import { createOrgSchema, inviteMemberSchema } from "../validators/org.js";
import { createEventSchema } from "../validators/event.js";
import * as orgService from "../services/org.service.js";
import * as eventService from "../services/event.service.js";
import { prisma } from "../lib/prisma.js";

export const orgRouter = Router();

orgRouter.use(requireAuth);

orgRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = createOrgSchema.parse(req.body);
    const org = await orgService.createOrganization(req.user!.id, name);
    res.status(201).json(org);
  })
);

orgRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: { organization: true },
    });
    res.json(memberships.map((m) => ({ ...m.organization, role: m.role })));
  })
);

orgRouter.get(
  "/:orgId",
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.params.orgId } });
    res.json(org);
  })
);

orgRouter.get(
  "/:orgId/events",
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    res.json(await orgService.listOrgEvents(req.params.orgId));
  })
);

orgRouter.post(
  "/:orgId/events",
  requireOrgRole("ORGANIZER"),
  asyncHandler(async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(req.params.orgId, req.user!.id, input);
    res.status(201).json(event);
  })
);

orgRouter.get(
  "/:orgId/members",
  requireOrgRole("VIEWER"),
  asyncHandler(async (req, res) => {
    const members = await prisma.membership.findMany({
      where: { organizationId: req.params.orgId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    res.json(members);
  })
);

orgRouter.post(
  "/:orgId/members",
  requireOrgRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const input = inviteMemberSchema.parse(req.body);
    const membership = await orgService.inviteMember(req.params.orgId, input.email, input.role);
    res.status(201).json(membership);
  })
);
