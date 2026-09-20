"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch, ApiError } from "@/lib/api";
import type { AttendeeRow } from "@/lib/types";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { LoadingBlock, ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";

function FlagBadge({ reasons, t }: { reasons: string[]; t: (path: string) => string }) {
  if (!reasons.length) return null;
  const title = reasons.map((r) => t(`attendeeTable.flagReason_${r}`)).join(" · ");
  return (
    <span
      title={title}
      className="inline-flex shrink-0 cursor-help items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
    >
      ⚠ {t("attendeeTable.flaggedTitle")}
    </span>
  );
}

export function AttendeeTable({ eventId }: { eventId: string }) {
  const { t, locale } = useLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "attended" | "not_attended">("");

  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (status) qs.set("status", status);

  const { data, isLoading, mutate } = useSWR<AttendeeRow[]>(
    `/api/events/${eventId}/attendees${qs.toString() ? `?${qs}` : ""}`,
    (path) => apiFetch(path),
    { refreshInterval: 8000 }
  );

  // Every one of these is keyed per-user, not a shared scalar id — a scalar
  // "current row" id gets overwritten the moment a second row's action
  // starts, which would silently re-enable the first row's button (and its
  // confirm state) while that row's own request is still in flight, letting
  // it be double-submitted.
  const [overridingIds, setOverridingIds] = useState<Record<string, boolean>>({});
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [confirmingRemoveIds, setConfirmingRemoveIds] = useState<Record<string, boolean>>({});
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});
  const [confirmingRevokeIds, setConfirmingRevokeIds] = useState<Record<string, boolean>>({});
  const [revokingIds, setRevokingIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkMarking, setBulkMarking] = useState(false);

  function setFlag(setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, userId: string, on: boolean) {
    setter((prev) => {
      if (on) return { ...prev, [userId]: true };
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  // Returns whether the override succeeded — bulkMarkPresent needs that to
  // count failures without changing this function's own catch-and-display
  // -inline behavior for a single-row call.
  async function markPresent(userId: string): Promise<boolean> {
    setOverrideError(null);
    setFlag(setOverridingIds, userId, true);
    try {
      await apiFetch(`/api/attendance/${eventId}/override`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      await mutate();
      return true;
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : t("attendeeTable.overrideError"));
      return false;
    } finally {
      setFlag(setOverridingIds, userId, false);
    }
  }

  const notYetAttended = data?.filter((r) => !r.attended).map((r) => r.user.id) ?? [];
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  function toggleSelected(userId: string) {
    setSelectedIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function toggleSelectAll() {
    const allSelected = notYetAttended.length > 0 && notYetAttended.every((id) => selectedIds[id]);
    setSelectedIds(allSelected ? {} : Object.fromEntries(notYetAttended.map((id) => [id, true])));
  }

  async function bulkMarkPresent() {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    setBulkMarking(true);
    setOverrideError(null);
    const results = await Promise.all(ids.map((id) => markPresent(id)));
    const failures = results.filter((ok) => !ok).length;
    if (failures > 0) setOverrideError(t("attendeeTable.bulkPartialError", { count: failures }));
    setSelectedIds({});
    setBulkMarking(false);
  }

  async function revokeAttendance(userId: string) {
    if (!confirmingRevokeIds[userId]) {
      setOverrideError(null);
      setFlag(setConfirmingRevokeIds, userId, true);
      return;
    }
    setOverrideError(null);
    setFlag(setRevokingIds, userId, true);
    try {
      await apiFetch(`/api/attendance/${eventId}/attendees/${userId}`, { method: "DELETE" });
      setFlag(setConfirmingRevokeIds, userId, false);
      await mutate();
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : t("attendeeTable.revokeError"));
    } finally {
      setFlag(setRevokingIds, userId, false);
    }
  }

  async function removeRegistration(userId: string) {
    if (!confirmingRemoveIds[userId]) {
      setOverrideError(null);
      setFlag(setConfirmingRemoveIds, userId, true);
      return;
    }
    setOverrideError(null);
    setFlag(setRemovingIds, userId, true);
    try {
      await apiFetch(`/api/events/${eventId}/registrations/${userId}`, { method: "DELETE" });
      setFlag(setConfirmingRemoveIds, userId, false);
      await mutate();
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : t("attendeeTable.removeError"));
    } finally {
      setFlag(setRemovingIds, userId, false);
    }
  }

  return (
    <div>
      {overrideError && <ErrorBlock message={overrideError} className="mb-3" />}
      <div className="mb-3 flex flex-wrap gap-2">
        <Input
          placeholder={t("attendeeTable.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
          underline={false}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-void-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-shu-500/60"
        >
          <option value="">{t("attendeeTable.filterAll")}</option>
          <option value="attended">{t("attendeeTable.filterAttended")}</option>
          <option value="not_attended">{t("attendeeTable.filterNotAttended")}</option>
        </select>
        {selectedCount > 0 && (
          <Button variant="cyan" size="sm" loading={bulkMarking} onClick={bulkMarkPresent}>
            {t("attendeeTable.bulkMarkPresent", { count: selectedCount })}
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="py-8 text-center text-sm text-white/35">{t("attendeeTable.noMatch")}</p>
      ) : (
        <>
          <div className="scroll-thin max-h-96 space-y-2 overflow-auto sm:hidden">
            {data.map((row) => (
              <div key={row.registrationId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{row.user.name}</p>
                    <p className="truncate text-xs text-white/45">{row.user.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <FlagBadge reasons={row.flagReasons} t={t} />
                    {row.waitlisted && <Badge>{t("badge.waitlisted")}</Badge>}
                    {row.attended ? <Badge status="COMPLETED">{t("badge.attended")}</Badge> : <Badge>{t("badge.pending")}</Badge>}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-4 border-t border-white/[0.06] pt-2.5 text-xs text-white/45">
                  <span>
                    {t("attendeeTable.colCheckedIn")}:{" "}
                    {row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US") : "—"}
                  </span>
                  <span>
                    {t("attendeeTable.colDistance")}: {row.distanceMeters != null ? `${row.distanceMeters}m` : "—"}
                  </span>
                </div>
                {!row.attended ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
                    <Button variant="ghost" size="sm" loading={!!overridingIds[row.user.id]} onClick={() => markPresent(row.user.id)}>
                      {t("attendeeTable.markPresent")}
                    </Button>
                    {confirmingRemoveIds[row.user.id] ? (
                      <>
                        <span className="text-xs text-white/50">{t("attendeeTable.confirmRemove")}</span>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={!!removingIds[row.user.id]}
                          onClick={() => removeRegistration(row.user.id)}
                        >
                          {t("attendeeTable.removeRegistration")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFlag(setConfirmingRemoveIds, row.user.id, false)}>
                          {t("common.cancel")}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => removeRegistration(row.user.id)}>
                        {t("attendeeTable.removeRegistration")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
                    {confirmingRevokeIds[row.user.id] ? (
                      <>
                        <span className="text-xs text-white/50">{t("attendeeTable.confirmRevoke")}</span>
                        <Button
                          variant="danger"
                          size="sm"
                          loading={!!revokingIds[row.user.id]}
                          onClick={() => revokeAttendance(row.user.id)}
                        >
                          {t("attendeeTable.revokeAttendance")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setFlag(setConfirmingRevokeIds, row.user.id, false)}>
                          {t("common.cancel")}
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => revokeAttendance(row.user.id)}>
                        {t("attendeeTable.revokeAttendance")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="scroll-thin hidden max-h-96 overflow-auto rounded-lg sm:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-void-900/95 text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={t("attendeeTable.selectAll")}
                      disabled={notYetAttended.length === 0}
                      checked={notYetAttended.length > 0 && notYetAttended.every((id) => selectedIds[id])}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-white/20 bg-void-900/80 accent-kehai-500"
                    />
                  </th>
                  <th className="px-4 py-2.5 font-medium">{t("attendeeTable.colName")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("attendeeTable.colEmail")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("attendeeTable.colStatus")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("attendeeTable.colCheckedIn")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("attendeeTable.colDistance")}</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {data.map((row) => (
                  <tr key={row.registrationId} className="text-white/75">
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={t("attendeeTable.selectRow", { name: row.user.name })}
                        disabled={row.attended}
                        checked={!!selectedIds[row.user.id]}
                        onChange={() => toggleSelected(row.user.id)}
                        className="h-4 w-4 rounded border-white/20 bg-void-900/80 accent-kehai-500 disabled:opacity-30"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-white">{row.user.name}</td>
                    <td className="px-4 py-2.5 text-white/50">{row.user.email}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {row.attended ? <Badge status="COMPLETED">{t("badge.attended")}</Badge> : <Badge>{t("badge.pending")}</Badge>}
                        {row.waitlisted && <Badge>{t("badge.waitlisted")}</Badge>}
                        <FlagBadge reasons={row.flagReasons} t={t} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-white/50">
                      {row.checkedInAt ? new Date(row.checkedInAt).toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-white/50">{row.distanceMeters != null ? `${row.distanceMeters}m` : "—"}</td>
                    <td className="px-4 py-2.5">
                      {!row.attended ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={!!overridingIds[row.user.id]}
                            onClick={() => markPresent(row.user.id)}
                          >
                            {t("attendeeTable.markPresent")}
                          </Button>
                          {confirmingRemoveIds[row.user.id] ? (
                            <>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={!!removingIds[row.user.id]}
                                onClick={() => removeRegistration(row.user.id)}
                              >
                                {t("attendeeTable.removeRegistration")}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setFlag(setConfirmingRemoveIds, row.user.id, false)}>
                                {t("common.cancel")}
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => removeRegistration(row.user.id)}>
                              {t("attendeeTable.removeRegistration")}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {confirmingRevokeIds[row.user.id] ? (
                            <>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={!!revokingIds[row.user.id]}
                                onClick={() => revokeAttendance(row.user.id)}
                              >
                                {t("attendeeTable.revokeAttendance")}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setFlag(setConfirmingRevokeIds, row.user.id, false)}>
                                {t("common.cancel")}
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => revokeAttendance(row.user.id)}>
                              {t("attendeeTable.revokeAttendance")}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
