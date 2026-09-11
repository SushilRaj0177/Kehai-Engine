"use client";

import { useEffect, useRef } from "react";

/**
 * A trailing glow ring that follows the pointer with a slight lag, and
 * swells + shifts color over anything clickable — the system cursor is
 * hidden entirely (via the "hide-native-cursor" class on <html>, see
 * globals.css) while this is active, so the ring is the only pointer
 * visible. No-ops entirely on touch devices (no fine pointer) or with
 * reduced motion — the system cursor is left alone in both cases, since
 * nothing would be there to replace it.
 */
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ring = ringRef.current;
    const streak = streakRef.current;
    if (!ring || !streak) return;

    document.documentElement.classList.add("hide-native-cursor");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let hovering = false;
    let overSmallStateControl = false;
    let raf = 0;
    let streakOpacity = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      const target = e.target as Element | null;
      // Small color-coded state indicators (a toggle switch, a checkbox)
      // are their own feedback — enlarging the ring to 1.8x and boosting
      // its opacity right on top of one, the same treatment a full-size
      // button gets, means the ring's red/cyan glow (mix-blend-screen)
      // sits directly over the control's own on/off color at exactly the
      // moment its state changes, reading as if the toggle itself glitched.
      overSmallStateControl = !!target?.closest("[role='switch'], [role='checkbox'], [role='radio'], input[type='checkbox'], input[type='radio']");
      hovering = !overSmallStateControl && !!target?.closest("a, button, [role='button'], input, textarea, [data-cursor-hover]");
    }

    function tick() {
      // Lerp toward the real pointer so the ring trails slightly instead of
      // snapping — the actual "premium" cue, not the ring's shape itself.
      const prevX = ringX;
      const prevY = ringY;
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (ring) {
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${hovering ? 1.8 : 1})`;
        // Even at rest, the ring's 24px diameter is close enough to a small
        // control's own footprint (this toggle's thumb is 20px) to visually
        // collide with it — fade the ring back rather than merely declining
        // to enlarge it.
        ring.style.opacity = overSmallStateControl ? "0.15" : hovering ? "0.9" : "0.55";
      }

      // A sandevistan-style speed-streak: a thin blade of light stretched
      // along the direction of travel, its length riding the ring's own
      // per-frame velocity (not the raw mouse delta, so it inherits the
      // same trailing lag rather than jittering a frame ahead of it) and
      // decaying fast the instant the cursor slows — a flash of motion,
      // not a persistent tail.
      const vx = ringX - prevX;
      const vy = ringY - prevY;
      const speed = Math.hypot(vx, vy);
      const targetOpacity = Math.min(1, speed / 26);
      streakOpacity += (targetOpacity - streakOpacity) * (targetOpacity > streakOpacity ? 0.9 : 0.35);

      if (streak) {
        const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
        const length = 18 + Math.min(speed * 2.6, 150);
        streak.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}deg) scaleX(${length / 40})`;
        streak.style.opacity = String(streakOpacity * 0.85);
      }

      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("hide-native-cursor");
    };
  }, []);

  return (
    <>
      <div
        ref={streakRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[99] h-[3px] w-10 rounded-full mix-blend-screen"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(34,226,245,0.85) 35%, rgba(255,45,85,0.9) 75%, transparent)",
          opacity: 0,
          willChange: "transform, opacity",
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed left-0 top-0 z-[100] h-6 w-6 rounded-full mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(255,45,85,0.9), rgba(34,226,245,0.5) 60%, transparent 75%)",
          transition: "opacity 200ms ease",
          willChange: "transform",
        }}
      />
    </>
  );
}
