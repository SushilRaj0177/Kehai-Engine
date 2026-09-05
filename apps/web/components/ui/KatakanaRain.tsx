const GLYPHS =
  "ケハイエンジンシステムデータネットワーク検証出席洞察信頼気配催事組織現場知識確認接続監視解析距離時間座標認証";

// Deterministic pseudo-random pick so server and client render identically
// (no hydration mismatch) while still looking varied — a fixed LCG seeded
// by position, not Math.random().
function pick(seed: number, len: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * len);
}

function column(colIndex: number, rows: number): string[] {
  return Array.from({ length: rows }, (_, row) => GLYPHS[pick(colIndex * 97 + row * 31 + 1, GLYPHS.length)]);
}

/**
 * A column-based "digital rain" of katakana/kanji drifting downward behind
 * hero content — genuinely animated (CSS keyframes, GPU-cheap transform-only),
 * not a static decorative glyph. Deterministic output keeps SSR and
 * hydration in sync without needing client-side JS at all.
 */
export function KatakanaRain({ columns = 16, className = "" }: { columns?: number; className?: string }) {
  const rows = 24;
  const cols = Array.from({ length: columns }, (_, i) => i);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="flex h-full w-full justify-between">
        {cols.map((c) => {
          const chars = column(c, rows);
          const duration = 14 + (c % 5) * 3.5; // 14–28s, varied per column
          const delay = -(c * 1.7) % duration; // negative delay: already mid-loop, staggered
          return (
            <div key={c} className="relative h-full flex-1 overflow-hidden">
              <div
                className="rain-column absolute inset-x-0 top-0 flex flex-col items-center font-mono text-[11px] leading-[2.1] text-kehai-400/[0.14]"
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
