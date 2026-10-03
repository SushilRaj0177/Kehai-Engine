"use client";

import { useEffect } from "react";
import { applyTheme } from "@/lib/theme";

// Keeps <html data-theme> in step after the inline boot script has set it:
// follows the phone switching between light and dark while the app is open,
// and the app being opened installed vs in a tab. Renders nothing.
export function ThemeSync() {
  useEffect(() => {
    applyTheme();
    const queries = ["(prefers-color-scheme: light)", "(display-mode: standalone)"].map((q) => window.matchMedia(q));
    queries.forEach((mq) => mq.addEventListener("change", applyTheme));
    return () => queries.forEach((mq) => mq.removeEventListener("change", applyTheme));
  }, []);
  return null;
}
