"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n";
import type { HeatmapResponse } from "@/lib/types";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-white/[0.04]",
  1: "bg-kehai-500/[0.25]",
  2: "bg-kehai-500/[0.5]",
  3: "bg-kehai-500/[0.75]",
  4: "bg-kehai-500",
};

interface Week {
  key: string;
  firstDate: Date;
  // index 0 = Sunday … 6 = Saturday
  cells: ({ date: string; level: 0 | 1 | 2 | 3 | 4 } | null)[];
}

function buildWeeks(days: HeatmapResponse["days"]): Week[] {
  if (!days.length) return [];
  const byDate = new Map(days.map((d) => [d.date, d]));
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date + "T00:00:00");
  const last = new Date(sorted[sorted.length - 1].date + "T00:00:00");

  // Walk back to the Sunday that starts the first week.
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());

  const weeks: Week[] = [];
  const cursor = new Date(start);
  while (cursor <= last) {
    const cells: Week["cells"] = [];
    const weekStart = new Date(cursor);
    for (let i = 0; i < 7; i++) {
      const iso = cursor.toISOString().slice(0, 10);
      const entry = byDate.get(iso);
      cells.push(entry ? { date: entry.date, level: entry.level } : cursor >= first && cursor <= last ? { date: iso, level: 0 } : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push({ key: weekStart.toISOString().slice(0, 10), firstDate: weekStart, cells });
  }
  return weeks;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceHeatmap({ data, className }: { data: HeatmapResponse; className?: string }) {
  const { t, locale } = useLocale();
  const weeks = useMemo(() => buildWeeks(data.days), [data.days]);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", { month: "short" }), [locale]);
  const today = todayIso();

  const attendanceRate = data.totalSessions > 0 ? data.presentCount / data.totalSessions : 0;

  // Label a week's column with a month name only when that week is the
  // first to fall in that month (avoids repeating the label every column).
  let lastMonth = -1;
  const monthLabels = weeks.map((w) => {
    const m = w.firstDate.getMonth();
    const show = m !== lastMonth;
    lastMonth = m;
    return show ? monthFmt.format(w.firstDate) : "";
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-stretch gap-3">
        {data.scope === "student" ? (
          <>
            <StatTile label={t("heatmap.statCurrentStreak")} value={data.currentStreak} accent="shu" flame />
            <StatTile label={t("heatmap.statLongestStreak")} value={data.longestStreak} />
            <StatTile label={t("heatmap.statPresentDays")} value={data.presentCount} />
            <StatTile label={t("heatmap.statTotalSessions")} value={data.totalSessions} />
            <StatTile label={t("heatmap.statAttendanceRate")} value={`${Math.round(attendanceRate * 100)}%`} accent="cyan" />
          </>
        ) : (
          <>
            <StatTile label={t("heatmap.statTotalSessions")} value={data.totalSessions} />
            <StatTile label={t("heatmap.statAttendanceRate")} value={`${Math.round(attendanceRate * 100)}%`} accent="cyan" />
          </>
        )}
      </div>

      <div className="scroll-thin overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-6 text-[10px] text-white/35">
            {weeks.map((w, i) => (
              <div key={w.key} className="w-[13px] shrink-0 text-left">
                {monthLabels[i]}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex w-6 shrink-0 flex-col justify-between gap-[3px] pb-[1px] text-[10px] text-white/30">
              <span />
              <span>{locale === "ja" ? "月" : "M"}</span>
              <span />
              <span>{locale === "ja" ? "水" : "W"}</span>
              <span />
              <span>{locale === "ja" ? "金" : "F"}</span>
              <span />
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week.key} className="flex flex-col gap-[3px]">
                  {week.cells.map((cell, i) =>
                    cell ? (
                      <div
                        key={i}
                        title={cell.date}
                        className={cn(
                          "h-[13px] w-[13px] rounded-sm transition-transform duration-150 hover:z-10 hover:scale-125 hover:shadow-[0_0_8px_rgba(34,226,245,0.5)]",
                          LEVEL_CLASS[cell.level],
                          cell.date === today && "ring-1 ring-shu-400"
                        )}
                      />
                    ) : (
                      <div key={i} className="h-[13px] w-[13px]" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-white/35">
        <span>{t("heatmap.legendLess")}</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <div key={lvl} className={cn("h-[11px] w-[11px] rounded-sm", LEVEL_CLASS[lvl])} />
        ))}
        <span>{t("heatmap.legendMore")}</span>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  flame,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "shu" | "cyan";
  flame?: boolean;
}) {
  return (
    <div className="flex min-w-[7rem] flex-1 items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      {flame && <span className="text-lg text-shu-400">🔥</span>}
      <div>
        <div
          className={cn(
            "font-display text-2xl font-bold",
            accent === "shu" ? "text-shu-400" : accent === "cyan" ? "text-kehai-400" : "text-white"
          )}
        >
          {value}
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      </div>
    </div>
  );
}
