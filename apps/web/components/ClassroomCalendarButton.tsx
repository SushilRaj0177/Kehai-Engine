"use client";

import { useState } from "react";
import { getApiBase, getAccessToken } from "@/lib/api";
import { Button } from "./ui/Button";
import { ErrorBlock } from "./ui/States";
import { useLocale } from "@/lib/i18n";

/**
 * Unlike an event's calendar.ics (a plain <a href>, since that route is
 * public), a classroom's is auth-gated — a random logged-in user shouldn't
 * get a calendar feed of a class they're not in — so a plain link can't
 * carry the Authorization header a browser navigation never sends. Same
 * fetch-then-blob-download pattern as ExportButtons for that reason.
 */
export function ClassroomCalendarButton({ classroomId }: { classroomId: string }) {
  const { t } = useLocale();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setDownloading(true);
    setError(false);
    try {
      const res = await fetch(`${getApiBase()}/api/classrooms/${classroomId}/calendar.ics`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      });
      if (!res.ok) throw new Error("Calendar export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "classroom.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" loading={downloading} onClick={download}>
        {t("classroomDetail.addToCalendar")}
      </Button>
      {error && <ErrorBlock message={t("exportButtons.error")} />}
    </div>
  );
}
