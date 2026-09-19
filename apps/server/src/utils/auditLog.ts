import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

// Genesis value for the very first hashed row in the table — an arbitrary
// fixed string, not a secret (the chain's integrity comes from the hash
// function and each row covering the previous row's hash, not from this
// being unguessable).
const GENESIS_HASH = "kehai-engine-audit-log-genesis";

const MAX_SERIALIZATION_RETRIES = 3;

export interface AppendAuditLogInput {
  organizationId?: string | null;
  eventId?: string | null;
  classroomId?: string | null;
  actorUserId?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
}

// Postgres JSONB does not preserve object key insertion order, so a
// metadata object hashed here at write time and re-read at verify time
// would otherwise stringify differently even when semantically identical,
// producing false positives ("tampered" rows that were never touched).
// Sorting keys recursively before stringifying makes the hash depend only
// on content, not on storage-layer key ordering.
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(",")}}`;
}

function computeHash(prevHash: string, createdAt: Date, data: AppendAuditLogInput): string {
  const canonical = canonicalStringify({
    prevHash,
    createdAt: createdAt.toISOString(),
    organizationId: data.organizationId ?? null,
    eventId: data.eventId ?? null,
    classroomId: data.classroomId ?? null,
    actorUserId: data.actorUserId ?? null,
    action: data.action,
    metadata: data.metadata ?? null,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * The only sanctioned way to write an AuditLog row. Every action that
 * touches attendance, membership, or an event's lifecycle goes through
 * here so the hash chain (see the AuditLog model comment in schema.prisma)
 * stays unbroken — a direct prisma.auditLog.create() call would silently
 * produce a row with no hash, invisible to verifyAuditLogChain().
 *
 * Serializable isolation + a bounded retry on the read-latest-hash step
 * because two concurrent overrides could otherwise both read the same
 * "latest" row and build on the same prevHash — Postgres detects that as
 * a serialization conflict under this isolation level and we just retry.
 */
export async function appendAuditLog(data: AppendAuditLogInput) {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const last = await tx.auditLog.findFirst({
            where: { hash: { not: null } },
            orderBy: { createdAt: "desc" },
            select: { hash: true },
          });
          const prevHash = last?.hash ?? GENESIS_HASH;
          const createdAt = new Date();
          const hash = computeHash(prevHash, createdAt, data);
          return tx.auditLog.create({
            data: {
              organizationId: data.organizationId ?? null,
              eventId: data.eventId ?? null,
              classroomId: data.classroomId ?? null,
              actorUserId: data.actorUserId ?? null,
              action: data.action,
              metadata: (data.metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
              createdAt,
              prevHash,
              hash,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      const isSerializationFailure =
        err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2034" || err.code === "40001");
      if (isSerializationFailure && attempt < MAX_SERIALIZATION_RETRIES - 1) continue;
      throw err;
    }
  }
  throw new Error("appendAuditLog: exhausted retries under write contention");
}

export interface AuditLogChainResult {
  valid: boolean;
  rowsChecked: number;
  /** id of the first row where the recomputed hash no longer matches, if any. */
  brokenAtId: string | null;
}

/**
 * Re-walks every hashed row in insertion order and recomputes each hash
 * from its own fields plus the previous row's hash, confirming it matches
 * what's stored. A row edited or deleted after the fact — including by
 * someone with direct database access — breaks the chain from that point
 * forward, which this detects. Rows written before the chain existed have
 * a null hash and are skipped, not treated as a break.
 */
export async function verifyAuditLogChain(): Promise<AuditLogChainResult> {
  const rows = await prisma.auditLog.findMany({
    where: { hash: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  let expectedPrevHash = GENESIS_HASH;
  let rowsChecked = 0;
  for (const row of rows) {
    rowsChecked++;
    const recomputed = computeHash(expectedPrevHash, row.createdAt, {
      organizationId: row.organizationId,
      eventId: row.eventId,
      classroomId: row.classroomId,
      actorUserId: row.actorUserId,
      action: row.action,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    });
    if (row.prevHash !== expectedPrevHash || row.hash !== recomputed) {
      return { valid: false, rowsChecked, brokenAtId: row.id };
    }
    expectedPrevHash = row.hash!;
  }
  return { valid: true, rowsChecked, brokenAtId: null };
}
