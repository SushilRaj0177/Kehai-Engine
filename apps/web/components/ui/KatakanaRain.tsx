"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS =
  "ケハイエンジンシステムデータネットワーク検証出席洞察信頼気配催事組織現場知識確認接続監視解析距離時間座標認証";

// Deterministic first paint (seeded, not Math.random) so SSR and hydration
// match exactly — real randomness only kicks in client-side, post-mount.
function seededPick(seed: number, len: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * len);
}

function initialMatrix(cols: number, rows: number): string[][] {
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => GLYPHS[seededPick(c * 97 + r * 31 + 1, GLYPHS.length)])
  );
}

/**
 * Digital rain: columns of katakana/kanji drifting down (CSS transform,
 * GPU-cheap) while individual glyphs flicker to new characters as they
 * fall — the actual behavior people mean by "Matrix rain," not a static
 * falling list. Glyph mutation runs client-side only after mount so the
 * server-rendered HTML and first client paint match exactly.
 */
export function KatakanaRain({ columns = 16, className = "" }: { columns?: number; className?: string }) {
  const rows = 24;
  const [matrix, setMatrix] = useState<string[][]>(() => initialMatrix(columns, rows));
  const matrixRef = useRef(matrix);
  matrixRef.current = matrix;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const totalCells = columns * rows;
    // Mutate a large fraction of all cells every tick — the previous version
    // touched only ~14 cells total out of 400+ every 120ms, so almost every
    // glyph sat still for seconds at a time and only a couple ever seemed to
    // change. A real digital-rain effect has glyphs flickering constantly,
    // all over, not just one spot.
    const mutationsPerTick = Math.ceil(totalCells * 0.25);

    const interval = setInterval(() => {
      const next = matrixRef.current.map((col) => [...col]);
      for (let i = 0; i < mutationsPerTick; i++) {
        const c = Math.floor(Math.random() * columns);
        const r = Math.floor(Math.random() * rows);
        next[c][r] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setMatrix(next);
    }, 90);

    return () => clearInterval(interval);
  }, [columns, rows]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="flex h-full w-full justify-between">
        {matrix.map((chars, c) => {
          const duration = 14 + (c % 5) * 3.5;
          const delay = -(c * 1.7) % duration;
          return (
            <div key={c} className="relative h-full flex-1 overflow-hidden">
              <div
                className="rain-column absolute inset-x-0 top-0 flex flex-col items-center font-mono text-[11px] leading-[2.1] text-kehai-400/[0.19]"
                style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
              >
                {[...chars, ...chars].map((ch, i) => (
                  <span key={i}>{ch}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
