"use client";

import { useSyncExternalStore } from "react";
import { THEME_GROUND, THEME_KEY, type Theme } from "./theme-boot";

// Light mode exists only in the installed app. A browser tab (desktop or
// phone) always stays dark, exactly as before; the installed app follows
// the phone's own light/dark setting unless the user picks one in Settings.
//
// The theme lives on <html data-theme="light|dark">. Every colour that
// changes is a CSS variable (tailwind.config.ts, globals.css, pwa.css), so
// dark mode renders exactly what it always did and light mode only swaps
// the variable values.

export type ThemeChoice = "system" | "light" | "dark";
export type { Theme };
export { THEME_GROUND, THEME_KEY };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(choice: ThemeChoice = readThemeChoice()): Theme {
  if (!isStandalone()) return "dark";
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const listeners = new Set<() => void>();

/** Puts the resolved theme on <html>, its ground colour and the status-bar colour. */
export function applyTheme(): void {
  const theme = resolveTheme();
  const root = document.documentElement;
  if (root.dataset.theme !== theme) {
    root.dataset.theme = theme;
    root.style.backgroundColor = THEME_GROUND[theme];
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_GROUND[theme]);
  }
  listeners.forEach((l) => l());
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private mode etc.: the choice just won't persist past this visit.
  }
  applyTheme();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The user's choice in Settings ("system" until they pick one). */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readThemeChoice, () => "system");
}
