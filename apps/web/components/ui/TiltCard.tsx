"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Subtle 3D tilt that follows the cursor, plus a soft light that tracks it
 * across the surface — the "premium card" interaction seen on most
 * higher-end product sites, implemented directly (no library) since it's
 * just a couple of CSS custom properties driven by pointer position.
 */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - py) * 8;
    const rotateY = (px - 0.5) * 10;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    el.style.setProperty("--glow-x", `${px * 100}%`);
    el.style.setProperty("--glow-y", `${py * 100}%`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn("tilt-card transition-transform duration-200 ease-out will-change-transform", className)}
    >
      {children}
    </div>
  );
}
