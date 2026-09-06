"use client";

import { useState } from "react";
import { getApiBase, getAccessToken } from "@/lib/api";
import { Button } from "./ui/Button";
import { useLocale } from "@/lib/i18n";

export function ExportButtons({ eventId }: { eventId: string }) {
  const { t } = useLocale();
  const [downloading, setDownloading] = useState<"csv" | "xlsx" | null>(null);

  async function download(format: "csv" | "xlsx") {
    setDownloading(format);
    try {
      const res = await fetch(`${getApiBase()}/api/export/events/${eventId}/attendees.${format}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" loading={downloading === "csv"} onClick={() => download("csv")}>
        {t("exportButtons.csv")}
      </Button>
      <Button variant="secondary" size="sm" loading={downloading === "xlsx"} onClick={() => download("xlsx")}>
        {t("exportButtons.excel")}
      </Button>
    </div>
  );
}
