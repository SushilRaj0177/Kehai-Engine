"use client";

import { useState } from "react";
import Link from "next/link";
import { useClassroomRoster } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { useLocale } from "@/lib/i18n";

// A threshold, not a hard rule — flags students worth a teacher's attention
// rather than making any judgment itself. Requires a few sessions on the
// books first so a single missed first day doesn't put someone on the list.
const RISK_THRESHOLD = 0.75;
const MIN_SESSIONS = 3;
const MAX_SHOWN = 5;

export function AtRiskStudents({ classroomId }: { classroomId: string }) {
  const { t } = useLocale();
  // Same SWR key ClassroomRoster already uses — this doesn't cost a second
  // network round-trip, just reads the shared cache.
  const { data } = useClassroomRoster(classroomId);

  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [nudgedId, setNudgedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const atRisk = data
    .filter((row) => row.totalDays >= MIN_SESSIONS && row.attendanceRate < RISK_THRESHOLD)
    .sort((a, b) => a.attendanceRate - b.attendanceRate)
    .slice(0, MAX_SHOWN);

  if (atRisk.length === 0) return null;

  async function sendNudge(studentId: string) {
    setError(null);
    setNudgedId(null);
    setNudgingId(studentId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/students/${studentId}/nudge`, { method: "POST" });
      setNudgedId(studentId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("atRisk.nudgeError"));
    } finally {
      setNudgingId(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-shu-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("atRisk.heading")}</span>
      </div>
      {error && <p className="text-xs text-shu-400">{error}</p>}
      <ul className="space-y-1.5">
        {atRisk.map((row) => (
          <li
            key={row.student.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-shu-500/20 bg-shu-500/[0.05] px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-white/85">{row.student.name}</p>
              <p className="text-xs text-white/40">
                {t("atRisk.presentOf", { present: row.presentDays, total: row.totalDays })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-sm font-bold text-shu-400">{Math.round(row.attendanceRate * 100)}%</span>
              {nudgedId === row.student.id ? (
                <span className="text-xs text-kehai-400">✓ {t("atRisk.nudgeSent")}</span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={nudgingId === row.student.id}
                  onClick={() => sendNudge(row.student.id)}
                >
                  {t("atRisk.sendNudge")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Link href="#roster" className="block text-xs font-medium text-white/35 hover:text-white/60">
        {t("atRisk.viewRoster")}
      </Link>
    </div>
  );
}
