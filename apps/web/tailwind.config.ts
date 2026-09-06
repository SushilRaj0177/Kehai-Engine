import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#05070a",
          900: "#0a0e14",
          800: "#0f141c",
          700: "#161c27",
          600: "#212938",
        },
        shu: {
          // "朱" (shu) — vermillion, the torii-gate red used as primary accent
          400: "#ff5c73",
          500: "#ff2d55",
          600: "#e01b45",
          700: "#b31338",
        },
        kehai: {
          // "気配" cyan — presence/signal accent
          400: "#5ff4ff",
          500: "#22e2f5",
          600: "#0cb9cc",
        },
        gold: {
          400: "#f6c453",
          500: "#e8a93a",
        },
      },
      fontFamily: {
        // Space Grotesk carries Latin glyphs; Noto Sans JP is only reached
        // for characters Space Grotesk doesn't cover (kanji/katakana), via
        // ordinary per-character font-family fallback — not a rewrite of
        // the Japanese type, just no longer the *default* voice for Latin.
        display: ["var(--font-display-latin)", "var(--font-jp)", "var(--font-sans)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "36px 36px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,45,85,0.25), 0 0 24px rgba(255,45,85,0.15)",
        "glow-cyan": "0 0 0 1px rgba(34,226,245,0.25), 0 0 24px rgba(34,226,245,0.15)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        scan: "scan 3s linear infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
