"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { Input, Label } from "./ui/Input";
import { ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";
import { GRADE_YEAR_OPTIONS, type GradeYear } from "@/lib/types";

interface JoinResponse {
  classroom: { id: string; name: string; courseCode: string | null; semesterLabel: string | null; teacherName: string; hasGeofence: boolean };
  enrollment: unknown;
}

export function JoinClassroomForm({
  initialCode = "",
  onJoined,
}: {
  initialCode?: string;
  onJoined: (result: JoinResponse) => void;
}) {
  const { t } = useLocale();
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 6));
  const [gradeYear, setGradeYear] = useState<GradeYear | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<JoinResponse>("/api/classrooms/join", {
        method: "POST",
        body: JSON.stringify({ code, ...(gradeYear ? { gradeYear } : {}) }),
      });
      onJoined(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("joinClassroomForm.joinError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="join-code">{t("joinClassroomForm.codeLabel")}</Label>
        <Input
          id="join-code"
          required
          underline={false}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder={t("joinClassroomForm.codePlaceholder")}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          className="font-mono text-lg tracking-[0.35em]"
        />
      </div>
      <div>
        <Label htmlFor="join-grade-year">{t("joinClassroomForm.gradeYearLabel")}</Label>
        <select
          id="join-grade-year"
          value={gradeYear}
          onChange={(e) => setGradeYear(e.target.value as GradeYear | "")}
          className="h-full rounded-lg border border-white/10 bg-void-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-shu-500/60"
        >
          <option value="">{t("gradeYear.unset")}</option>
          {GRADE_YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {t(`gradeYear.${y}`)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" loading={loading} disabled={code.length !== 6}>
        {t("joinClassroomForm.submit")}
      </Button>
      {error && <ErrorBlock message={error} className="sm:ml-3 sm:mt-0" />}
    </form>
  );
}
