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
  stacked = false,
}: {
  initialCode?: string;
  onJoined: (result: JoinResponse) => void;
  // The desktop/original layout packs code + grade-year + submit into one
  // row on wide screens. Inside a narrow standalone SURFACE panel that
  // row never actually reaches its sm: breakpoint, so it fell back to
  // flex-col with each control at its own intrinsic width -- a full-width
  // code input next to a barely-there select and a small button, instead
  // of matching every other primary action in the PWA (always full width).
  // `stacked` opts into that full-width column explicitly rather than
  // relying on a breakpoint that never fires at this container size.
  stacked?: boolean;
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

  const selectField = (
    <select
      id="join-grade-year"
      value={gradeYear}
      onChange={(e) => setGradeYear(e.target.value as GradeYear | "")}
      className={
        stacked
          ? "h-11 w-full rounded-lg border border-white/10 bg-void-900/80 px-3 text-sm text-white outline-none focus:border-shu-500/60"
          : "h-full rounded-lg border border-white/10 bg-void-900/80 px-3 py-2.5 text-sm text-white outline-none focus:border-shu-500/60"
      }
    >
      <option value="">{t("gradeYear.unset")}</option>
      {GRADE_YEAR_OPTIONS.map((y) => (
        <option key={y} value={y}>
          {t(`gradeYear.${y}`)}
        </option>
      ))}
    </select>
  );

  if (stacked) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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
          {selectField}
        </div>
        {error && <ErrorBlock message={error} />}
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length !== 6}>
          {t("joinClassroomForm.submit")}
        </Button>
      </form>
    );
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
        {selectField}
      </div>
      <Button type="submit" loading={loading} disabled={code.length !== 6}>
        {t("joinClassroomForm.submit")}
      </Button>
      {error && <ErrorBlock message={error} className="sm:ml-3 sm:mt-0" />}
    </form>
  );
}
