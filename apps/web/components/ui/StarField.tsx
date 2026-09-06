"use client";

import { useMemo } from "react";

// Deterministic pseudo-random (seeded), not Math.random — same reasoning as
// KatakanaRain's initial matrix: keeps SSR and first client paint identical,
// so there's no hydration-mismatch flash of stars jumping to new positions.
function seeded(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A handful of faint twinkling dots scattered behind hero content — the
 * "quiet depth" cue from the reference DeFi/trading site hero shots, where
 * the background never sits perfectly flat/empty even where there's no
 * other decoration.
 */
export function StarField({ count = 50, className = "" }: { count?: number; className?: string }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${seeded(i * 7.1 + 1) * 100}%`,
        top: `${seeded(i * 13.7 + 2) * 100}%`,
        size: 1 + seeded(i * 5.3 + 3) * 1.5,
        delay: `${seeded(i * 3.3 + 4) * 6}s`,
        duration: `${3 + seeded(i * 9.1 + 5) * 4}s`,
      })),
    [count]
  );

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="star-dot absolute rounded-full bg-white"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}
