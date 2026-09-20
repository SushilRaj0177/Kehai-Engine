import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { appendAuditLog, verifyAuditLogChain } from "../src/utils/auditLog.js";
import { getAuditLog, getAuditLogActions } from "../src/services/org.service.js";

// Other test files run concurrently against the same database and also
// write real AuditLog rows through their own normal flows (checking a
// student in, removing a member, etc.) — that's expected and harmless: as
// long as every write goes through appendAuditLog (which the whole app
// does; nothing bypasses it), the global chain stays valid regardless of
// how those rows interleave with this file's. So these tests scope their
// own cleanup narrowly (never a blanket delete of the table) and avoid
// asserting exact row counts or exact positions that only hold in an
// otherwise-empty table.

let actorId: string;
let orgId: string;

beforeAll(async () => {
  const actor = await prisma.user.create({
    data: { name: "Audit Actor", email: `audit-actor-${crypto.randomUUID()}@example.com`, provider: "PASSWORD" },
  });
  actorId = actor.id;

  const org = await prisma.organization.create({ data: { name: "Audit Test Org", slug: `audit-org-${crypto.randomUUID()}` } });
  orgId = org.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  await prisma.user.delete({ where: { id: actorId } });
  await prisma.$disconnect();
});

describe("appendAuditLog / verifyAuditLogChain", () => {
  it("writes a hash that chains onto the previous row's hash", async () => {
    const first = await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.one", metadata: { n: 1 } });
    const second = await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.two", metadata: { n: 2 } });

    expect(first.hash).toBeTruthy();
    expect(second.prevHash).toBe(first.hash);
    expect(second.hash).not.toBe(first.hash);
  });

  it("verifies the chain as valid after only legitimate writes", async () => {
    await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.a" });
    await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.b" });
    await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.c" });

    const result = await verifyAuditLogChain();
    expect(result.valid).toBe(true);
    expect(result.brokenAtId).toBeNull();
    expect(result.rowsChecked).toBeGreaterThan(0);
  });

  it("is unaffected by JSON key order in stored metadata (Postgres JSONB doesn't preserve it)", async () => {
    const row = await appendAuditLog({
      organizationId: orgId,
      actorUserId: actorId,
      action: "test.keyorder",
      metadata: { z: 1, a: 2, m: 3 },
    });
    expect(row.hash).toBeTruthy();

    const result = await verifyAuditLogChain();
    expect(result.valid).toBe(true);
  });

  it("detects a row whose fields were edited after being written (tamper-evidence)", async () => {
    const row = await appendAuditLog({ organizationId: orgId, actorUserId: actorId, action: "test.original", metadata: { amount: 1 } });

    // Simulate exactly the scenario this feature exists to catch: someone
    // with direct database access silently rewrites a past row without
    // going through appendAuditLog. The row's own recomputed hash no
    // longer matches what's stored, so this is caught the moment the
    // walker reaches it — deterministic regardless of what else is in the
    // table or being written concurrently by other test files.
    await prisma.auditLog.update({ where: { id: row.id }, data: { action: "test.tampered" } });

    const result = await verifyAuditLogChain();
    expect(result.valid).toBe(false);
    expect(result.brokenAtId).toBe(row.id);
    // Deliberately left in place rather than "fixed up" — a real tamper
    // attempt wouldn't get cleaned up either, and afterAll's org-scoped
    // delete removes it along with the rest of this file's rows once no
    // more verify() calls in this file depend on the chain being clean.
  });
});

describe("getAuditLog pagination and filtering", () => {
  it("returns every written row exactly once, newest first", async () => {
    const scopeOrg = await prisma.organization.create({ data: { name: "Audit Page Org", slug: `audit-page-${crypto.randomUUID()}` } });
    const written = [];
    for (let i = 0; i < 5; i++) {
      written.push(await appendAuditLog({ organizationId: scopeOrg.id, actorUserId: actorId, action: `test.page.${i}` }));
    }

    const result = await getAuditLog(scopeOrg.id);
    expect(result.entries.map((e) => e.id)).toEqual(written.map((e) => e.id).reverse());
    expect(result.nextCursor).toBeNull();

    // The cursor a second page would start from is the last row of this
    // page — exercised directly since 5 rows never exceed one page size.
    const nextPage = await getAuditLog(scopeOrg.id, { cursor: result.entries[result.entries.length - 1].id });
    expect(nextPage.entries).toHaveLength(0);

    await prisma.auditLog.deleteMany({ where: { organizationId: scopeOrg.id } });
    await prisma.organization.delete({ where: { id: scopeOrg.id } });
  });

  it("filters by action", async () => {
    const scopeOrg = await prisma.organization.create({ data: { name: "Audit Filter Org", slug: `audit-filter-${crypto.randomUUID()}` } });
    await appendAuditLog({ organizationId: scopeOrg.id, actorUserId: actorId, action: "test.filter.a" });
    await appendAuditLog({ organizationId: scopeOrg.id, actorUserId: actorId, action: "test.filter.b" });

    const result = await getAuditLog(scopeOrg.id, { action: "test.filter.a" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe("test.filter.a");

    const actions = await getAuditLogActions(scopeOrg.id);
    expect(actions.sort()).toEqual(["test.filter.a", "test.filter.b"]);

    await prisma.auditLog.deleteMany({ where: { organizationId: scopeOrg.id } });
    await prisma.organization.delete({ where: { id: scopeOrg.id } });
  });
});
