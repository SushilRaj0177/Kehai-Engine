"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n";

type Unit = "s" | "m" | "h";

const UNIT_SECONDS: Record<Unit, number> = { s: 1, m: 60, h: 3600 };
const UNIT_KEY: Record<Unit, "unitSec" | "unitMin" | "unitHr"> = { s: "unitSec", m: "unitMin", h: "unitHr" };

// Named presets spanning the realistic range organizers actually want —
// a fast-refresh 30s window for high-security check-ins, up through
// multi-hour windows for long, low-risk events where re-scanning every
// 20s would just annoy people.
const PRESETS: { label: string; seconds: number }[] = [
  { label: "20s", seconds: 20 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "30m", seconds: 1800 },
  { label: "1h", seconds: 3600 },
  { label: "6h", seconds: 21600 },
];

function bestUnitFor(seconds: number): Unit {
  if (seconds % 3600 === 0 && seconds >= 3600) return "h";
  if (seconds % 60 === 0 && seconds >= 60) return "m";
  return "s";
}

export function QrRotationInput({
  value,
  onChange,
  min = 5,
  max = 86400,
  disabled = false,
}: {
  value: number;
  onChange: (seconds: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const [unit, setUnit] = useState<Unit>(() => bestUnitFor(value));
  const displayValue = useMemo(() => Math.max(1, Math.round(value / UNIT_SECONDS[unit])), [value, unit]);

  function setUnitPreservingSeconds(nextUnit: Unit) {
    setUnit(nextUnit);
  }

  function setCount(count: number) {
    const seconds = Math.min(max, Math.max(min, Math.round(count * UNIT_SECONDS[unit])));
    onChange(seconds);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.filter((p) => p.seconds >= min && p.seconds <= max).map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(p.seconds);
              setUnit(bestUnitFor(p.seconds));
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-colors disabled:opacity-40",
              value === p.seconds
                ? "border-shu-400/60 bg-shu-500/15 text-shu-300"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-white/35">{t("qrRotation.customLabel")}</span>
        <input
          type="number"
          disabled={disabled}
          min={1}
          value={displayValue}
          onChange={(e) => setCount(Number(e.target.value) || 1)}
          className="w-20 border-0 border-b border-white/15 bg-transparent px-1 py-1 text-sm text-white outline-none focus:border-shu-400/60 disabled:opacity-40"
        />
        <div className="flex overflow-hidden rounded-full border border-white/10">
          {(Object.keys(UNIT_KEY) as Unit[]).map((u) => (
            <button
              key={u}
              type="button"
              disabled={disabled}
              onClick={() => setUnitPreservingSeconds(u)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                unit === u ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {t(`qrRotation.${UNIT_KEY[u]}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
