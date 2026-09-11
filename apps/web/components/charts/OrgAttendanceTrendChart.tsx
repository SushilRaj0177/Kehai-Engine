"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocale } from "@/lib/i18n";
import type { OrgOverview } from "@/lib/types";

export function OrgAttendanceTrendChart({ events }: { events: OrgOverview["events"] }) {
  const { t, locale } = useLocale();

  const data = [...events]
    .filter((e) => e.registrations > 0)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((e) => ({
      name: e.name,
      label: new Date(e.startsAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", { month: "short", day: "numeric" }),
      rate: Math.round(e.attendanceRate * 100),
      registrations: e.registrations,
      attendance: e.attendance,
    }));

  if (data.length < 2) {
    return <div className="flex h-44 items-center justify-center text-sm text-white/30">{t("chart.needMoreEvents")}</div>;
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
          labelFormatter={(_v: unknown, item: any) => item?.[0]?.payload?.name ?? ""}
          formatter={(value: any, _name: any, item: any) => [
            t("chart.attendedOfRegistered", { attended: item.payload.attendance, total: item.payload.registrations }),
            `${value}%`,
          ]}
        />
        <Line type="monotone" dataKey="rate" stroke="#ff2d55" strokeWidth={2} dot={{ r: 3, fill: "#ff2d55" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
