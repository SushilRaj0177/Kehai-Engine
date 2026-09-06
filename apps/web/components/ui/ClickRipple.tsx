"use client";

import { useRef, useState, type ReactNode } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

/**
 * Wraps a section so clicking anywhere inside it (not just its buttons)
 * spawns a transient radial burst at the click point — a bit of "the page
 * is alive" feedback for what would otherwise be dead empty space in the
 * hero.
 */
export function ClickRippleLayer({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = nextId.current++;
    const ripple = { id, x: e.clientX - rect.left, y: e.clientY - rect.top };
    setRipples((prev) => [...prev, ripple]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 900);
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
      {ripples.map((r) => (
        <span key={r.id} aria-hidden className="hero-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </div>
  );
}
