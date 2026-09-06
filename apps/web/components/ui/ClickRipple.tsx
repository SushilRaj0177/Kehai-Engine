"use client";

import { useRef, useState, type ReactNode } from "react";

const GLYPHS = "気配出席検証洞察信頼催事組織現場知識確認接続監視解析距離時間座標認証ケハイエンジン";

interface Burst {
  id: number;
  x: number;
  y: number;
  particles: { glyph: string; dx: number; dy: number; rot: number; delay: number }[];
}

/**
 * Wraps a region so clicking anywhere inside it (not just its buttons)
 * throws a small burst of katakana/kanji glyphs outward from the click
 * point, plus a quick radial flash — replaces the earlier plain radial
 * ripple with something that actually reads as "this brand," not a
 * generic Material-style ripple.
 */
export function ClickRippleLayer({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const count = 7;
    const particles = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const distance = 55 + Math.random() * 55;
      return {
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rot: (Math.random() - 0.5) * 180,
        delay: Math.random() * 60,
      };
    });

    setBursts((prev) => [...prev, { id, x, y, particles }]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 950);
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
      {bursts.map((b) => (
        <span key={b.id} aria-hidden className="pointer-events-none absolute z-30" style={{ left: b.x, top: b.y }}>
          <span className="hero-flash" />
          {b.particles.map((p, i) => (
            <span
              key={i}
              className="glyph-particle"
              style={
                {
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                  "--rot": `${p.rot}deg`,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties
              }
            >
              {p.glyph}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
