"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useLocale } from "@/lib/i18n";

export function ArrivalTimelineChart({ data }: { data: { minuteOffset: number; count: number }[] }) {
  const { t } = useLocale();

  if (data.length === 0) {
    return <div className="flex h-52 items-center justify-center text-sm text-white/30">{t("chart.empty")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="arrivalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2d55" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#ff2d55" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="minuteOffset"
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}m`}
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          tickLine={false}
        />
        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ReferenceLine x={0} stroke="rgba(34,226,245,0.5)" strokeDasharray="4 4" label={{ value: t("chart.start"), fill: "#22e2f5", fontSize: 10, position: "top" }} />
        <Tooltip
          contentStyle={{ background: "#0f141c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(v) => t("chart.minutesFromStart", { signed: `${v > 0 ? "+" : ""}${v}` })}
          formatter={(value: number) => [t("chart.checkins", { count: value }), ""]}
        />
        <Area type="monotone" dataKey="count" stroke="#ff2d55" strokeWidth={2} fill="url(#arrivalFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
