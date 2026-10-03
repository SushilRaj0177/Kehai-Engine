import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--kc-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Every colour that differs in the installed app's light mode reads a
      // CSS variable (defined in globals.css: dark values on :root, light ones
      // under html[data-theme="light"]). The dark values are the original
      // hex colours, so dark mode renders exactly as before.
      colors: {
        white: v("white"),
        // Real white and near-black that never swap: QR codes and the
        // full-screen QR display need a white page in both themes.
        paper: "#ffffff",
        ink: "#05070a",
        void: {
          950: v("void-950"),
          900: v("void-900"),
          800: v("void-800"),
          700: v("void-700"),
          600: v("void-600"),
        },
        shu: {
          // "朱" (shu) — vermillion, the torii-gate red used as primary accent
          400: v("shu-400"),
          500: "#ff2d55",
          600: "#e01b45",
          700: "#b31338",
        },
        kehai: {
          // "気配" cyan — presence/signal accent
          400: v("kehai-400"),
          500: "#22e2f5",
          600: "#0cb9cc",
        },
        gold: {
          400: v("gold-400"),
          500: "#e8a93a",
        },
        amber: { 100: v("amber-100"), 200: v("amber-200"), 300: v("amber-300"), 400: v("amber-400") },
        emerald: { 300: v("emerald-300"), 400: v("emerald-400") },
        red: { 300: v("red-300") },
      },
      // Text only: in light mode faint text needs more weight than the same
      // tint used for a hairline or a wash, so text-white/NN is multiplied up
      // (by 1 in dark mode, so the value is unchanged there). text-void-950 is
      // dark text on a bright fill and stays dark in both themes.
      // text-on-accent is the white-on-fill counterpart.
      textColor: {
        white: "rgb(var(--kc-white) / min(1, calc(<alpha-value> * var(--kc-text-boost))))",
        void: { 950: "#05070a" },
        // White text on a solid red/cyan fill: white in both themes.
        "on-accent": "#ffffff",
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
