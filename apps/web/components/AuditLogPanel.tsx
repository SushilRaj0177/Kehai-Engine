"use client";

import { useOrgAuditLog } from "@/lib/hooks";
import { LoadingBlock } from "./ui/States";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/lib/i18n";
import type { AuditLogEntry } from "@/lib/types";

function describeEntry(entry: AuditLogEntry, t: (path: string, vars?: Record<string, any>) => string) {
  const actorName = entry.actor?.name ?? t("auditLog.unknownActor");
  const meta = (entry.metadata ?? {}) as Record<string, any>;

  switch (entry.action) {
    case "attendance.override":
      return t("auditLog.attendanceOverride", { actor: actorName, event: entry.event?.name ?? t("auditLog.unknownEvent") });
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

export function AuditLogPanel({ orgId }: { orgId: string }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useOrgAuditLog(orgId);

  if (isLoading) return <LoadingBlock />;
  if (!data?.length) {
    return <p className="py-8 text-center text-sm text-white/35">{t("auditLog.empty")}</p>;
  }

  return (
    <div className="scroll-thin max-h-96 space-y-2 overflow-auto">
      {data.map((entry) => (
        <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <p className="text-sm text-white/75">{describeEntry(entry, t)}</p>
          <span className="shrink-0 text-xs text-white/35">{formatDateTime(new Date(entry.createdAt), locale)}</span>
        </div>
      ))}
    </div>
  );
}
