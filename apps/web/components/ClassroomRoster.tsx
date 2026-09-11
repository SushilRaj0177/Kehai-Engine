"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { LoadingBlock } from "./ui/States";
import { AttendanceHeatmap } from "./AttendanceHeatmap";
import { useClassroomRoster, useClassroomHeatmap } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

export function ClassroomRoster({ classroomId, openSessionId }: { classroomId: string; openSessionId?: string | null }) {
  const { t, locale } = useLocale();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [overridingId, setOverridingId] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { data, isLoading, mutate } = useClassroomRoster(classroomId);

  const filtered = data?.filter((row) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return row.student.name.toLowerCase().includes(needle) || row.student.email.toLowerCase().includes(needle);
  });

  async function markPresent(studentId: string) {
    if (!openSessionId) return;
    setOverrideError(null);
    setOverridingId(studentId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${openSessionId}/override`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
      await mutate();
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : t("classroomRoster.overrideError"));
    } finally {
      setOverridingId(null);
    }
  }

  async function removeStudent(studentId: string) {
    if (confirmingRemoveId !== studentId) {
      setOverrideError(null);
      setConfirmingRemoveId(studentId);
      return;
    }
    setOverrideError(null);
    setRemovingId(studentId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/students/${studentId}`, { method: "DELETE" });
      setConfirmingRemoveId(null);
      await mutate();
    } catch (err) {
      setOverrideError(err instanceof ApiError ? err.message : t("classroomRoster.removeError"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <Input
          placeholder={t("classroomRoster.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
          underline={false}
        />
      </div>

      {overrideError && <p className="mb-3 text-sm text-shu-400">{overrideError}</p>}

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered?.length ? (
        <p className="py-8 text-center text-sm text-white/35">{t("classroomRoster.noMatch")}</p>
      ) : (
        <>
          <div className="scroll-thin max-h-96 space-y-2 overflow-auto sm:hidden">
            {filtered.map((row) => (
              <RosterCardItem
                key={row.student.id}
                classroomId={classroomId}
                row={row}
                locale={locale}
                expanded={expanded === row.student.id}
                onToggle={() => setExpanded((cur) => (cur === row.student.id ? null : row.student.id))}
                canOverride={!!openSessionId && !row.checkedInOpenSession}
                overriding={overridingId === row.student.id}
                onMarkPresent={() => markPresent(row.student.id)}
                confirmingRemove={confirmingRemoveId === row.student.id}
                removing={removingId === row.student.id}
                onRemove={() => removeStudent(row.student.id)}
                onCancelRemove={() => setConfirmingRemoveId(null)}
              />
            ))}
          </div>

          <div className="scroll-thin hidden max-h-96 overflow-auto rounded-lg sm:block">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-void-900/95 text-[11px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colName")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colEmail")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colPresent")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colTotal")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colRate")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colLastAttended")}</th>
                  {openSessionId && <th className="px-4 py-2.5 font-medium">{t("classroomRoster.colToday")}</th>}
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.map((row) => (
                  <RosterRowItem
                    key={row.student.id}
                    classroomId={classroomId}
                    row={row}
                    locale={locale}
                    expanded={expanded === row.student.id}
                    onToggle={() => setExpanded((cur) => (cur === row.student.id ? null : row.student.id))}
                    showTodayColumn={!!openSessionId}
                    canOverride={!!openSessionId && !row.checkedInOpenSession}
                    overriding={overridingId === row.student.id}
                    onMarkPresent={() => markPresent(row.student.id)}
                    confirmingRemove={confirmingRemoveId === row.student.id}
                    removing={removingId === row.student.id}
                    onRemove={() => removeStudent(row.student.id)}
                    onCancelRemove={() => setConfirmingRemoveId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

type RosterItemProps = {
  classroomId: string;
  row: NonNullable<ReturnType<typeof useClassroomRoster>["data"]>[number];
  locale: "en" | "ja";
  expanded: boolean;
  onToggle: () => void;
  canOverride: boolean;
  overriding: boolean;
  onMarkPresent: () => void;
  confirmingRemove: boolean;
  removing: boolean;
  onRemove: () => void;
  onCancelRemove: () => void;
};

function RosterCardItem({
  classroomId,
  row,
  locale,
  expanded,
  onToggle,
  canOverride,
  overriding,
  onMarkPresent,
  confirmingRemove,
  removing,
  onRemove,
  onCancelRemove,
}: RosterItemProps) {
  const { t } = useLocale();
  const { data: heatmap } = useClassroomHeatmap(expanded ? classroomId : undefined, row.student.id);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <button type="button" onClick={onToggle} className="w-full px-3.5 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{row.student.name}</p>
            <p className="truncate text-xs text-white/45">{row.student.email}</p>
          </div>
          <span className="shrink-0 text-kehai-400">{Math.round(row.attendanceRate * 100)}%</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5 text-xs text-white/45">
          <span>
            {t("classroomRoster.colPresent")}: {row.presentDays}/{row.totalDays}
          </span>
          <span>
            {t("classroomRoster.colLastAttended")}: {row.lastAttendedAt ? formatDate(row.lastAttendedAt, locale) : t("classroomRoster.never")}
          </span>
        </div>
      </button>
      {canOverride && (
        <div className="border-t border-white/[0.06] px-3.5 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            loading={overriding}
            onClick={(e) => {
              e.stopPropagation();
              onMarkPresent();
            }}
          >
            {t("classroomRoster.markPresent")}
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-white/[0.06] px-3.5 py-2.5">
        {confirmingRemove ? (
          <>
            <span className="text-xs text-white/50">{t("classroomRoster.confirmRemove")}</span>
            <Button
              variant="danger"
              size="sm"
              loading={removing}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              {t("classroomRoster.removeStudent")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancelRemove();
              }}
            >
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            {t("classroomRoster.removeStudent")}
          </Button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-white/[0.06] px-3.5 py-3">
          {heatmap ? <AttendanceHeatmap data={heatmap} /> : <LoadingBlock />}
        </div>
      )}
    </div>
  );
}

function RosterRowItem({
  classroomId,
  row,
  locale,
  expanded,
  onToggle,
  showTodayColumn,
  canOverride,
  overriding,
  onMarkPresent,
  confirmingRemove,
  removing,
  onRemove,
  onCancelRemove,
}: RosterItemProps & { showTodayColumn: boolean }) {
  const { t } = useLocale();
  const { data: heatmap } = useClassroomHeatmap(expanded ? classroomId : undefined, row.student.id);
  const actionsColSpan = showTodayColumn ? 8 : 7;

  return (
    <>
      <tr className="cursor-pointer text-white/75 transition-colors hover:bg-white/[0.03]" onClick={onToggle}>
        <td className="px-4 py-2.5 font-medium text-white">{row.student.name}</td>
        <td className="px-4 py-2.5 text-white/50">{row.student.email}</td>
        <td className="px-4 py-2.5 text-white/50">{row.presentDays}</td>
        <td className="px-4 py-2.5 text-white/50">{row.totalDays}</td>
        <td className="px-4 py-2.5 text-kehai-400">{Math.round(row.attendanceRate * 100)}%</td>
        <td className="px-4 py-2.5 text-white/50">
          {row.lastAttendedAt ? formatDate(row.lastAttendedAt, locale) : t("classroomRoster.never")}
        </td>
        {showTodayColumn && (
          <td className="px-4 py-2.5">
            {row.checkedInOpenSession ? (
              <span className="text-xs font-semibold text-kehai-400">{t("classroomRoster.present")}</span>
            ) : canOverride ? (
              <Button
                variant="ghost"
                size="sm"
                loading={overriding}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPresent();
                }}
              >
                {t("classroomRoster.markPresent")}
              </Button>
            ) : null}
          </td>
        )}
        <td className="px-4 py-2.5">
          {confirmingRemove ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                size="sm"
                loading={removing}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                {t("classroomRoster.removeStudent")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelRemove();
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              {t("classroomRoster.removeStudent")}
            </Button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={actionsColSpan} className="bg-white/[0.02] px-4 py-4">
            {heatmap ? <AttendanceHeatmap data={heatmap} /> : <LoadingBlock />}
          </td>
        </tr>
      )}
    </>
  );
}
