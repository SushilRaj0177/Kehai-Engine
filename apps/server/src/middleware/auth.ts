import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { prisma } from "../lib/prisma.js";
import type { OrgRole } from "@prisma/client";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw HttpError.unauthorized("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    throw HttpError.unauthorized("Invalid or expired token");
  }
}

/** Optional auth — populates req.user if a valid token is present, never throws. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.user = { id: payload.sub, email: payload.email, name: payload.name };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

const ROLE_RANK: Record<OrgRole, number> = {
  VIEWER: 0,
  ORGANIZER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Loads the caller's membership for :orgId (or the org derived from :eventId)
 * and enforces a minimum role. Always re-checks against the database — never
 * trusts client-supplied role claims.
 */
export function requireOrgRole(minRole: OrgRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized();

    let organizationId = req.params.orgId;
    if (!organizationId && req.params.eventId) {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
        select: { organizationId: true },
      });
      if (!event) throw HttpError.notFound("Event not found");
      organizationId = event.organizationId;
    }
    if (!organizationId) throw HttpError.badRequest("Organization context required");

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: req.user.id, organizationId } },
    });
    if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw HttpError.forbidden("Insufficient permissions for this organization");
    }

    (req as any).membership = membership;
    (req as any).organizationId = organizationId;
    next();
  };
}
