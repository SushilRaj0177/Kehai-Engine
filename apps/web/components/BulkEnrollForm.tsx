"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { Textarea, Label } from "./ui/Input";
import { ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";
import { GRADE_YEAR_OPTIONS, type GradeYear } from "@/lib/types";

interface BulkEnrollResult {
  enrolled: string[];
  alreadyEnrolled: string[];
  notFound: string[];
}

/**
 * A teacher onboarding a whole cohort at once (the STEP-program case) —
 * mirrors bulkEnrollStudents' own convention server-side: only existing
 * accounts get enrolled, so the "not found" list is the actionable output
 * here, not an error, since a real roster paste will usually have a few.
 */
export function BulkEnrollForm({ classroomId, onEnrolled }: { classroomId: string; onEnrolled: () => void }) {
  const { t } = useLocale();
  const [raw, setRaw] = useState("");
  const [gradeYear, setGradeYear] = useState<GradeYear | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkEnrollResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raw.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<BulkEnrollResult>(`/api/classrooms/${classroomId}/students/bulk`, {
        method: "POST",
        body: JSON.stringify({ emails: raw, ...(gradeYear ? { gradeYear } : {}) }),
      });
      setResult(data);
      if (data.enrolled.length > 0) {
        setRaw("");
        onEnrolled();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("bulkEnroll.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="bulk-emails">{t("bulkEnroll.label")}</Label>
        <Textarea
          id="bulk-emails"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("bulkEnroll.placeholder")}
          rows={4}
        />
        <p className="mt-1.5 text-xs text-white/35">{t("bulkEnroll.hint")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label htmlFor="bulk-grade-year">{t("joinClassroomForm.gradeYearLabel")}</Label>
          <select
            id="bulk-grade-year"
            value={gradeYear}
            onChange={(e) => setGradeYear(e.target.value as GradeYear | "")}
            className="h-10 rounded-lg border border-white/10 bg-void-900/80 px-3 text-sm text-white outline-none focus:border-shu-500/60"
          >
            <option value="">{t("gradeYear.unset")}</option>
            {GRADE_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {t(`gradeYear.${y}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" loading={submitting} disabled={!raw.trim()}>
          {t("bulkEnroll.submit")}
        </Button>
      </div>

      {error && <ErrorBlock message={error} />}

      {result && (
        <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-xs text-white/60">
          {result.enrolled.length > 0 && <p>{t("bulkEnroll.enrolledCount", { count: result.enrolled.length })}</p>}
          {result.alreadyEnrolled.length > 0 && (
            <p>{t("bulkEnroll.alreadyEnrolledCount", { count: result.alreadyEnrolled.length })}</p>
          )}
          {result.notFound.length > 0 && (
            <div>
              <p className="text-shu-400">{t("bulkEnroll.notFoundCount", { count: result.notFound.length })}</p>
              <p className="mt-1 break-words font-mono text-[11px] text-white/40">{result.notFound.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
