import { cn } from "@/lib/cn";

/**
 * Large, faint background kanji/katakana used purely as visual texture in
 * generous whitespace (hero sections, empty dashboard states) — never as
 * meaningless "Japan flavor" copy. Each usage is picked for what the word
 * actually means in context (気配 kehai = presence/sign of something about
 * to happen, 出席 shusseki = attendance, 検証 kenshou = verification).
 */
export function KanjiMark({
  glyph,
  className,
  accent = "shu",
  animate = true,
  prominent = false,
}: {
  glyph: string;
  className?: string;
  accent?: "shu" | "kehai";
  animate?: boolean;
  /** Boosts opacity for placements that need to read clearly over busy
   * backgrounds (e.g. sitting in front of the hero's rain effect) instead
   * of the default barely-there texture opacity. */
  prominent?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        // No hardcoded position class here on purpose — every caller passes
        // its own (absolute -right-6 ..., etc). Tailwind's stylesheet order
        // doesn't follow class-list order, so a hardcoded "relative" here
        // could silently beat a caller's "absolute" and collapse this back
        // into normal document flow (the exact bug that made every kanji
        // mark render top-left instead of at its intended position).
        "pointer-events-none z-10 select-none font-display font-black leading-none",
        accent === "shu" ? "text-shu-500" : "text-kehai-500",
        animate && "kanji-breathe",
        className
      )}
      style={
        {
          // The visible faintness comes entirely from this element-level
          // opacity (animated by kanji-breathe), not from a low-alpha text
          // color — stacking both used to multiply out to ~0.5% actual
          // opacity, which read as "not there" against any busy background.
          "--kanji-min": prominent ? 0.14 : 0.05,
          "--kanji-max": prominent ? 0.22 : 0.1,
          opacity: animate ? undefined : prominent ? 0.18 : 0.07,
        } as React.CSSProperties
      }
    >
      {glyph}
    </span>
  );
}

export function VerticalCaption({ text, className }: { text: string; className?: string }) {
  return (
    <span aria-hidden className={cn("vertical-jp select-none font-display text-[11px] text-white/25", className)}>
      {text}
    </span>
  );
}
