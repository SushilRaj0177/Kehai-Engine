import { cn } from "@/lib/cn";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "cyan";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-shu-500 text-white hover:bg-shu-400 shadow-glow border border-shu-400/40 disabled:hover:bg-shu-500",
  cyan: "bg-kehai-500 text-void-950 hover:bg-kehai-400 shadow-glow-cyan border border-kehai-400/40",
  secondary: "bg-void-700 text-white border border-white/10 hover:border-white/25 hover:bg-void-600",
  ghost: "bg-transparent text-white/80 hover:text-white hover:bg-white/5 border border-transparent",
  danger: "bg-red-950 text-red-200 border border-red-500/40 hover:bg-red-900",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
  md: "text-sm px-4 py-2 rounded-lg gap-2",
  lg: "text-base px-6 py-3 rounded-lg gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-wide transition-all duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shu-400/60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
