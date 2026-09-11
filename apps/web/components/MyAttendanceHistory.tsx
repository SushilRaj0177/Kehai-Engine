"use client";

import { useMyAttendanceHistory } from "@/lib/hooks";
import { LoadingBlock } from "./ui/States";
import { formatDate } from "@/lib/format";
import { useLocale } from "@/lib/i18n";

// The heatmap answers "what's my overall shape" at a glance; this answers
// the follow-up a student actually asks next — "wait, which one did I
// miss" — as a literal list, newest session first.
export function MyAttendanceHistory({ classroomId }: { classroomId: string }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useMyAttendanceHistory(classroomId);

  if (isLoading) return <LoadingBlock />;
  if (!data?.length) {
    return <p className="py-8 text-center text-sm text-white/35">{t("myAttendance.empty")}</p>;
  }

  return (
    <div className="scroll-thin max-h-80 space-y-1.5 overflow-auto">
      {data.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-white/85">
              {formatDate(row.date, locale)}
              {row.label ? ` · ${row.label}` : ""}
            </p>
            {row.present && row.checkedInAt && (
              <p className="text-xs text-white/40">
                {new Date(row.checkedInAt).toLocaleTimeString(locale === "ja" ? "ja-JP" : "en-US")}
                {row.method === "MANUAL_OVERRIDE" ? ` · ${t("myAttendance.markedByTeacher")}` : ""}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
              row.present
                ? "border-kehai-500/30 bg-kehai-500/10 text-kehai-300"
                : "border-shu-500/30 bg-shu-500/10 text-shu-300"
            }`}
          >
            {row.present ? t("myAttendance.present") : t("myAttendance.absent")}
          </span>
        </div>
      ))}
    </div>
  );
}
