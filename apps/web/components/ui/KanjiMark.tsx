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
}: {
  glyph: string;
  className?: string;
  accent?: "shu" | "kehai";
  animate?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none select-none font-display font-black leading-none",
        accent === "shu" ? "text-shu-500/[0.06]" : "text-kehai-500/[0.06]",
        animate && "kanji-breathe",
        className
      )}
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
