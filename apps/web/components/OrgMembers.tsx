"use client";

import { useState } from "react";
import { useOrgMembers } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { LoadingBlock, ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";
import type { OrgRole } from "@/lib/types";

const INVITABLE_ROLES: OrgRole[] = ["ADMIN", "ORGANIZER", "VIEWER"];
const ROLE_RANK: Record<OrgRole, number> = { VIEWER: 0, ORGANIZER: 1, ADMIN: 2, OWNER: 3 };

export function OrgMembers({ orgId, callerRole }: { orgId: string; callerRole: OrgRole | undefined }) {
  const { t } = useLocale();
  const { data, isLoading, mutate } = useOrgMembers(orgId);
  const canManage = callerRole === "ADMIN" || callerRole === "OWNER";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("ORGANIZER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Keyed per-member — changing one person's role must not disturb another
  // row's in-flight state or already-shown error.
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [roleErrors, setRoleErrors] = useState<Record<string, string>>({});

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviting(true);
    try {
      await apiFetch(`/api/orgs/${orgId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setEmail("");
      await mutate();
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : t("orgMembers.inviteError"));
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(userId: string, email: string, newRole: OrgRole) {
    setRoleErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setChangingRoleId(userId);
    try {
      // The invite endpoint upserts on (userId, organizationId), so
      // re-"inviting" an existing member with a new role just changes it —
      // no separate role-change endpoint needed, and the server's
      // ADMIN-can't-touch-OWNER guard applies here for free too.
      await apiFetch(`/api/orgs/${orgId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role: newRole }),
      });
      await mutate();
    } catch (err) {
      setRoleErrors((prev) => ({
        ...prev,
        [userId]: err instanceof ApiError ? err.message : t("orgMembers.roleChangeError"),
      }));
    } finally {
      setChangingRoleId(null);
    }
  }

  async function removeMember(userId: string) {
    if (confirmingRemoveId !== userId) {
      setRemoveError(null);
      setConfirmingRemoveId(userId);
      return;
    }
    setRemoveError(null);
    setRemovingId(userId);
    try {
      await apiFetch(`/api/orgs/${orgId}/members/${userId}`, { method: "DELETE" });
      setConfirmingRemoveId(null);
      await mutate();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : t("orgMembers.removeError"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      {canManage && (
        <form onSubmit={invite} className="mb-5 flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              type="email"
              required
              placeholder={t("orgMembers.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              underline={false}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            className="rounded-lg border border-white/10 bg-void-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-shu-500/60"
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`orgMembers.role_${r}`)}
              </option>
            ))}
          </select>
          <Button type="submit" size="md" loading={inviting}>
            {t("orgMembers.invite")}
          </Button>
        </form>
      )}

      {inviteError && <ErrorBlock message={inviteError} className="mb-3" />}
      {removeError && <ErrorBlock message={removeError} className="mb-3" />}

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-white/35">{t("orgMembers.noMembers")}</p>
      ) : (
        <div className="space-y-2">
          {data.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{member.user.name}</p>
                <p className="truncate text-xs text-white/45">{member.user.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  {canManage && callerRole && ROLE_RANK[member.role] < ROLE_RANK[callerRole] ? (
                    <select
                      value={member.role}
                      disabled={changingRoleId === member.user.id}
                      onChange={(e) => changeRole(member.user.id, member.user.email, e.target.value as OrgRole)}
                      className="rounded-full border border-white/10 bg-void-900/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/70 outline-none focus:border-shu-500/60 disabled:opacity-50"
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`orgMembers.role_${r}`)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
                      {t(`orgMembers.role_${member.role}`)}
                    </span>
                  )}
                {canManage &&
                  callerRole &&
                  ROLE_RANK[member.role] < ROLE_RANK[callerRole] &&
                  (confirmingRemoveId === member.user.id ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={removingId === member.user.id}
                        onClick={() => removeMember(member.user.id)}
                      >
                        {t("orgMembers.remove")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingRemoveId(null)}>
                        {t("common.cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(member.user.id)}>
                      {t("orgMembers.remove")}
                    </Button>
                  ))}
                </div>
                {roleErrors[member.user.id] && <p className="text-xs text-shu-400">{roleErrors[member.user.id]}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
