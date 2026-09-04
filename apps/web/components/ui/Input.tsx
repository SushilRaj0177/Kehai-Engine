import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-white/10 bg-void-900/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30",
        "outline-none transition-colors focus:border-shu-500/60 focus:ring-1 focus:ring-shu-500/40",
        className
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-white/10 bg-void-900/80 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30",
        "outline-none transition-colors focus:border-shu-500/60 focus:ring-1 focus:ring-shu-500/40",
        className
      )}
      {...props}
    />
  );
});
