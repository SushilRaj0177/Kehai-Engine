"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";
import { Input, Label } from "./ui/Input";
import { ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";

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
        body: JSON.stringify({ code }),
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
      <Button type="submit" loading={loading} disabled={code.length !== 6}>
        {t("joinClassroomForm.submit")}
      </Button>
      {error && <ErrorBlock message={error} className="sm:ml-3 sm:mt-0" />}
    </form>
  );
}
