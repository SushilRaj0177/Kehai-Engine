"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocale } from "@/lib/i18n";
import type { ClassSessionSummary } from "@/lib/types";

export function SessionTrendChart({ sessions, studentCount }: { sessions: ClassSessionSummary[]; studentCount: number }) {
  const { t, locale } = useLocale();

  const data = [...sessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => ({
      date: s.date,
      label: new Date(s.date).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" }),
      rate: studentCount > 0 ? Math.round((s.presentCount / studentCount) * 100) : 0,
      presentCount: s.presentCount,
    }));

  if (data.length < 2) {
    return <div className="flex h-44 items-center justify-center text-sm text-white/30">{t("chart.needMoreSessions")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ background: "#0f141c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, _name, item) => [
            t("chart.presentOfEnrolled", { present: item.payload.presentCount, total: studentCount }),
            `${value}%`,
          ]}
        />
        <Line type="monotone" dataKey="rate" stroke="#22e2f5" strokeWidth={2} dot={{ r: 3, fill: "#22e2f5" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
