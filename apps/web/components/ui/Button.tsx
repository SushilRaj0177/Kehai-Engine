import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "cyan";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

// Single-corner cut (echoes the brand's kanji-seal cut-corner motif) instead
// of a plain rounded rect — distinct enough to notice, subtle enough not to
// fight the label. Scales with size so small buttons don't look over-cut.
const cutCorner: Record<Size, string> = {
  sm: "12px",
  md: "14px",
  lg: "18px",
};

const variants: Record<Variant, string> = {
  primary: "bg-shu-500 text-white border border-shu-400/40 shadow-glow before:bg-white/25",
  cyan: "bg-kehai-500 text-void-950 border border-kehai-400/40 shadow-glow-cyan before:bg-white/30",
  secondary: "bg-void-700 text-white border border-white/10 before:bg-white/10",
  ghost: "bg-white/[0.04] text-white/85 border border-white/25 hover:border-white/40 before:bg-white/10",
  danger: "bg-red-950 text-red-200 border border-red-500/40 before:bg-red-400/20",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3.5 py-1.5 gap-1.5",
  md: "text-sm px-5 py-2.5 gap-2",
  lg: "text-base px-7 py-3.5 gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, style, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ clipPath: `polygon(0 0, calc(100% - ${cutCorner[size]}) 0, 100% ${cutCorner[size]}, 100% 100%, 0 100%)`, ...style }}
      className={cn(
        // The fill-sweep: a ::before layer scaled to 0 on the x-axis, sitting
        // under the label (z-0 vs relative z-10 text), growing in from the
        // left on hover/focus — a real motion cue instead of a flat color
        // swap, without needing extra DOM nodes.
        "group relative isolate inline-flex items-center justify-center overflow-hidden font-semibold tracking-wide",
        "transition-transform duration-150 active:scale-[0.97]",
        "before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:transition-transform before:duration-300 before:ease-out",
        "hover:before:scale-x-100 focus-visible:before:scale-x-100",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="relative z-10 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
});
