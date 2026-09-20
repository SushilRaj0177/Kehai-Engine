"use client";

import { useClassroomLeaderboard } from "@/lib/hooks";
import { LoadingBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Opt-in gamification, not a grading tool — ranked by current streak (ties
 * broken by longest streak, then rate), reusing data the heatmap already
 * computes per student. Fits a cohort used to leaderboards (the STEP case)
 * without needing any new attendance concept.
 */
export function ClassroomLeaderboard({ classroomId }: { classroomId: string }) {
  const { t } = useLocale();
  const { data, isLoading } = useClassroomLeaderboard(classroomId);

  if (isLoading) return <LoadingBlock />;
  if (!data?.length) {
    return <p className="py-8 text-center text-sm text-white/35">{t("leaderboard.empty")}</p>;
  }

  return (
    <div className="scroll-thin max-h-96 space-y-1.5 overflow-auto">
      {data.map((entry, i) => (
        <div
          key={entry.student.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="w-6 shrink-0 text-center text-sm">{MEDALS[i] ?? `#${i + 1}`}</span>
            <p className="truncate text-sm text-white/80">{entry.student.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-white/45">
            <span className="font-mono text-kehai-400">
              🔥 {entry.currentStreak}
            </span>
            <span>{Math.round(entry.attendanceRate * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
