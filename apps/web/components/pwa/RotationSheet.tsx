"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n";

// The control room's "how often does the code change" picker: a bottom
// sheet with the common periods one tap away and a custom value for the
// rest. Same limits as the server (5 s to 24 h).

const MIN_SECONDS = 5;
const MAX_SECONDS = 86400;
const PRESETS = [10, 20, 30, 60, 120, 300, 900, 3600];

type Unit = "s" | "m" | "h";
const UNIT_SECONDS: Record<Unit, number> = { s: 1, m: 60, h: 3600 };

/** 20 → "20s", 300 → "5m", 3600 → "1h", 90 → "1m 30s". */
export function formatPeriod(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function bestUnit(seconds: number): Unit {
  if (seconds >= 3600 && seconds % 3600 === 0) return "h";
  if (seconds >= 60 && seconds % 60 === 0) return "m";
  return "s";
}

export function RotationSheet({
  seconds,
  saving,
  error,
  onPick,
  onClose,
}: {
  seconds: number;
  saving: boolean;
  error: string | null;
  onPick: (seconds: number) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [unit, setUnit] = useState<Unit>(() => bestUnit(seconds));
  const [count, setCount] = useState(() => String(Math.round(seconds / UNIT_SECONDS[bestUnit(seconds)])));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const custom = Math.round(Number(count) * UNIT_SECONDS[unit]);
  const customValid = Number.isFinite(custom) && custom >= MIN_SECONDS && custom <= MAX_SECONDS;

  return createPortal(
    <div className="pwa-sheet-backdrop" onClick={onClose}>
      <div className="pwa-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("pwa.rotationTitle")}>
        <div className="pwa-sheet-grip" />
        <div className="pwa-sheet-head">
          <h2>{t("pwa.rotationTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("pwa.closeQr")}>
            ✕
          </button>
        </div>
        <p className="pwa-sheet-note">{t("pwa.rotationHint")}</p>

        <div className="pwa-rot-grid" role="radiogroup" aria-label={t("pwa.rotationTitle")}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={p === seconds}
              className={`pwa-rot-preset ${p === seconds ? "pwa-on" : ""}`}
              disabled={saving}
              onClick={() => onPick(p)}
            >
              {formatPeriod(p)}
            </button>
          ))}
        </div>

        <form
          className="pwa-rot-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (customValid) onPick(custom);
          }}
        >
          <span className="pwa-rot-label">{t("pwa.rotationCustom")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-label={t("pwa.rotationCustom")}
            className="pwa-rot-input"
          />
          <div className="pwa-rot-units">
            {(["s", "m", "h"] as Unit[]).map((u) => (
              <button key={u} type="button" className={unit === u ? "pwa-on" : ""} aria-pressed={unit === u} onClick={() => setUnit(u)}>
                {u}
              </button>
            ))}
          </div>
          <button type="submit" className="pwa-rot-set" disabled={saving || !customValid}>
            {t("pwa.rotationSet")}
          </button>
        </form>
        {!customValid && count !== "" && <p className="pwa-rot-msg">{t("pwa.rotationRange")}</p>}
        {error && <p className="pwa-rot-msg">{error}</p>}
      </div>
    </div>,
    document.body
  );
}
