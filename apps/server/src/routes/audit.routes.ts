import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";
import { verifyAuditLogChain } from "../utils/auditLog.js";

export const auditRouter = Router();

// Deliberately public and content-free — it proves the hash chain is
// unbroken (see the AuditLog model comment in schema.prisma) without
// exposing any organization's, classroom's, or event's actual log
// entries. Anyone evaluating the "we can't quietly favor someone" claim
// can hit this directly instead of taking it on faith.
auditRouter.get(
  "/verify",
  asyncHandler(async (_req, res) => {
    const result = await verifyAuditLogChain();
    res.json({ ...result, checkedAt: new Date().toISOString() });
  })
);
