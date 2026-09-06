"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { LoadingBlock } from "./ui/States";
import { AttendanceHeatmap } from "./AttendanceHeatmap";
import { useClassroomRoster, useClassroomHeatmap } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

export function ClassroomRoster({ classroomId }: { classroomId: string }) {
  const { t, locale } = useLocale();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useClassroomRoster(classroomId);

  const filtered = data?.filter((row) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return row.student.name.toLowerCase().includes(needle) || row.student.email.toLowerCase().includes(needle);
  });

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

      {isLoading ? (
        <LoadingBlock />
      ) : !filtered?.length ? (
        <p className="py-8 text-center text-sm text-white/35">{t("classroomRoster.noMatch")}</p>
      ) : (
        <>
          <div className="scroll-thin max-h-96 space-y-2 overflow-auto sm:hidden">
            {filtered.map((row) => (
              <RosterCardItem
                key={row.enrollmentId}
                classroomId={classroomId}
                row={row}
                locale={locale}
                expanded={expanded === row.enrollmentId}
                onToggle={() => setExpanded((cur) => (cur === row.enrollmentId ? null : row.enrollmentId))}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filtered.map((row) => (
                  <RosterRowItem
                    key={row.enrollmentId}
                    classroomId={classroomId}
                    row={row}
                    locale={locale}
                    expanded={expanded === row.enrollmentId}
                    onToggle={() => setExpanded((cur) => (cur === row.enrollmentId ? null : row.enrollmentId))}
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

function RosterCardItem({
  classroomId,
  row,
  locale,
  expanded,
  onToggle,
}: {
  classroomId: string;
  row: NonNullable<ReturnType<typeof useClassroomRoster>["data"]>[number];
  locale: "en" | "ja";
  expanded: boolean;
  onToggle: () => void;
}) {
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
}: {
  classroomId: string;
  row: NonNullable<ReturnType<typeof useClassroomRoster>["data"]>[number];
  locale: "en" | "ja";
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useLocale();
  const { data: heatmap } = useClassroomHeatmap(expanded ? classroomId : undefined, row.student.id);

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
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-white/[0.02] px-4 py-4">
            {heatmap ? <AttendanceHeatmap data={heatmap} /> : <LoadingBlock />}
          </td>
        </tr>
      )}
    </>
  );
}
