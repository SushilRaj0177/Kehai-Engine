"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useOrgAuditLogActions } from "@/lib/hooks";
import { Button } from "./ui/Button";
import { LoadingBlock } from "./ui/States";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import type { AuditLogEntry } from "@/lib/types";

interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: string | null;
}

function describeEntry(entry: AuditLogEntry, t: (path: string, vars?: Record<string, any>) => string) {
  const actorName = entry.actor?.name ?? t("auditLog.unknownActor");
  const meta = (entry.metadata ?? {}) as Record<string, any>;

  switch (entry.action) {
    case "attendance.override":
      return t("auditLog.attendanceOverride", { actor: actorName, event: entry.event?.name ?? t("auditLog.unknownEvent") });
    case "class_attendance.override":
      return t("auditLog.classAttendanceOverride", { actor: actorName });
    case "registration.removed":
      return t("auditLog.registrationRemoved", { actor: actorName, event: entry.event?.name ?? t("auditLog.unknownEvent") });
    case "member.removed":
      return t("auditLog.memberRemoved", {
        actor: actorName,
        role: meta.removedRole ? t(`orgMembers.role_${meta.removedRole}`) : "",
      });
    default:
      return `${actorName} — ${entry.action}`;
  }
}

export function AuditLogPanel({ orgId, classroomId }: { orgId?: string; classroomId?: string }) {
  const { t, locale } = useLocale();
  const { data: actions } = useOrgAuditLogActions(orgId);
  const [actionFilter, setActionFilter] = useState("");
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const basePath = orgId ? `/api/orgs/${orgId}/audit-log` : `/api/classrooms/${classroomId}/audit-log`;

  useEffect(() => {
    setEntries(null);
    setNextCursor(null);
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    apiFetch<AuditLogPage>(`${basePath}?${params.toString()}`).then((page) => {
      setEntries(page.entries);
      setNextCursor(page.nextCursor);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, actionFilter]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ cursor: nextCursor });
      if (actionFilter) params.set("action", actionFilter);
      const page = await apiFetch<AuditLogPage>(`${basePath}?${params.toString()}`);
      setEntries((prev) => [...(prev ?? []), ...page.entries]);
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  if (entries === null) return <LoadingBlock />;

  return (
    <div className="space-y-3">
      {orgId && actions && actions.length > 1 && (
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-void-900/80 px-3 py-2 text-xs text-white/70 outline-none focus:border-shu-500/60"
        >
          <option value="">{t("auditLog.allActions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      {!entries.length ? (
        <p className="py-8 text-center text-sm text-white/35">{t("auditLog.empty")}</p>
      ) : (
        <>
          <div className="scroll-thin max-h-96 space-y-2 overflow-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <p className="text-sm text-white/75">{describeEntry(entry, t)}</p>
                <span className="shrink-0 text-xs text-white/35">{formatDateTime(new Date(entry.createdAt), locale)}</span>
              </div>
            ))}
          </div>
          {nextCursor && (
            <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadMore} className="w-full">
              {t("auditLog.loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
