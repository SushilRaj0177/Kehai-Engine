"use client";

import { useEffect, useState } from "react";
import { useIsStandalone } from "@/lib/useStandalone";

// TEMPORARY diagnostic, not part of the redesign -- remove once we've
// confirmed what's actually happening on the reporter's device. Prints,
// directly on screen (no devtools needed), the three things that would
// tell us apart "code bug" from "this device never got data-standalone
// set": what useIsStandalone() itself resolves to, what's actually sitting
// on <html>'s dataset right now, and what a real .hud-surface element on
// this exact page is computing for background-color (rgba(10,14,20,0.6)
// is a solid pre-redesign card, rgba(255,255,255,0.015) is the new one).
export function DebugStandaloneBadge() {
  const isStandalone = useIsStandalone();
  const [snapshot, setSnapshot] = useState<string>("reading…");

  useEffect(() => {
    const id = setInterval(() => {
      const htmlAttr = document.documentElement.dataset.standalone ?? "(unset)";
      const el = document.querySelector<HTMLElement>(".hud-surface");
      const bg = el ? getComputedStyle(el).backgroundColor : "(no .hud-surface found)";
      setSnapshot(`hook=${String(isStandalone)} html[data-standalone]=${htmlAttr} .hud-surface bg=${bg}`);
    }, 500);
    return () => clearInterval(id);
  }, [isStandalone]);

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 8,
        right: 8,
        zIndex: 9999,
        background: "#000",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 10,
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #0f0",
        wordBreak: "break-all",
      }}
    >
      DEBUG {snapshot}
    </div>
  );
}
