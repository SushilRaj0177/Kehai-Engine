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

function clipPath(cut: string) {
  return `polygon(0 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% 100%, 0 100%)`;
}

// A native CSS `border` is painted along the element's pre-clip rectangle
// and only then clipped along with everything else — there's no border
// declared along the diagonal edge the clip-path itself creates, so every
// non-solid-looking variant showed a corner with a border on every edge
// except the cut one, reading as a rendering glitch rather than the
// intended cut-corner style. Fixed by drawing the border as its own
// full-size clipped layer with a colored fill, then a second, slightly
// inset clipped layer with the actual button color on top — only a thin
// ring of the bottom layer is left showing, and it now follows the cut
// corner correctly because it's the same clip-path, not a border property.
const fillColor: Record<Variant, string> = {
  primary: "bg-shu-500",
  cyan: "bg-kehai-500",
  secondary: "bg-void-700",
  ghost: "bg-white/[0.04]",
  danger: "bg-red-950",
};

const borderColor: Record<Variant, string> = {
  primary: "bg-shu-400/40",
  cyan: "bg-kehai-400/40",
  secondary: "bg-white/10",
  ghost: "bg-white/25 transition-colors group-hover:bg-white/40",
  danger: "bg-red-500/40",
};

const sweepColor: Record<Variant, string> = {
  primary: "bg-white/25",
  cyan: "bg-white/30",
  secondary: "bg-white/10",
  ghost: "bg-white/10",
  danger: "bg-red-400/20",
};

const labelColor: Record<Variant, string> = {
  primary: "text-white",
  cyan: "text-void-950",
  secondary: "text-white",
  ghost: "text-white/85",
  danger: "text-red-200",
};

const shadow: Record<Variant, string> = {
  primary: "shadow-glow",
  cyan: "shadow-glow-cyan",
  secondary: "",
  ghost: "",
  danger: "",
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
  const cut = cutCorner[size];
  const innerCut = `calc(${cut} - 1px)`;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ clipPath: clipPath(cut), ...style }}
      className={cn(
        "group relative isolate inline-flex items-center justify-center font-semibold tracking-wide",
        "transition-transform duration-150 active:scale-[0.97]",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60",
        labelColor[variant],
        shadow[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {/* Border layer, full size */}
      <span aria-hidden className={cn("absolute inset-0 z-0", borderColor[variant])} style={{ clipPath: clipPath(cut) }} />
      {/* Fill layer, inset 1px so the border layer shows through as a ring */}
      <span aria-hidden className={cn("absolute inset-[1px] z-0", fillColor[variant])} style={{ clipPath: clipPath(innerCut) }} />
      {/* Hover fill-sweep, same shape as the fill layer, growing in from the left */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-[1px] z-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100",
          sweepColor[variant]
        )}
        style={{ clipPath: clipPath(innerCut) }}
      />
      {loading ? (
        <span className="relative z-10 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      <span className="relative z-10">{children}</span>
    </button>
  );
});
