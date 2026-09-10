"use client";

import { useState } from "react";
import { getApiBase, getAccessToken } from "@/lib/api";
import { Button } from "./ui/Button";
import { useLocale } from "@/lib/i18n";

type ExportSource = { kind: "event"; eventId: string } | { kind: "classroom"; classroomId: string };

export function ExportButtons({ eventId }: { eventId: string }) {
  return <ExportButtonsInternal source={{ kind: "event", eventId }} />;
}

export function ClassroomExportButtons({ classroomId }: { classroomId: string }) {
  return <ExportButtonsInternal source={{ kind: "classroom", classroomId }} />;
}

function ExportButtonsInternal({ source }: { source: ExportSource }) {
  const { t } = useLocale();
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  const basePath =
    source.kind === "event"
      ? `/api/export/events/${source.eventId}/attendees`
      : `/api/export/classrooms/${source.classroomId}/attendance`;

  async function download(format: "csv" | "xlsx") {
    setDownloading(format);
    try {
      const res = await fetch(`${getApiBase()}${basePath}.${format}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${source.kind === "event" ? "attendees" : "attendance"}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" loading={downloading === "csv"} onClick={() => download("csv")}>
        {t("exportButtons.csv")}
      </Button>
      <Button variant="secondary" size="sm" loading={downloading === "xlsx"} onClick={() => download("xlsx")}>
        {t("exportButtons.excel")}
      </Button>
    </div>
  );
}
