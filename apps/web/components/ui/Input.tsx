import { cn } from "@/lib/cn";
import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-white/45", className)} {...props} />;
}

// A shared underline-focus treatment: flat surface, no box border, with a
// gradient rule that grows from the center on focus — reads as a considered
// input rather than a stock rounded-rect field, and the grow-from-center
// motion is a real focus cue instead of just a color swap.
const fieldBase =
  "peer w-full border-0 border-b border-white/12 bg-white/[0.03] px-4 py-3.5 text-base text-white placeholder:text-white/30 outline-none transition-colors focus:bg-white/[0.05]";
const fieldRule =
  "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center scale-x-0 bg-gradient-to-r from-shu-400 via-shu-500 to-kehai-400 transition-transform duration-300 ease-out peer-focus:scale-x-100";

interface InputExtraProps {
  /** Set false to drop the underline rule entirely — for compact, inline
   * fields (a table search box, an inline "ask a question" bar) where the
   * permanent gray baseline plus the focus rule read as a stray line/render
   * glitch rather than a field. Form fields (login, event creation, etc.)
   * keep it on by default. */
  underline?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & InputExtraProps>(
  function Input({ className, underline = true, ...props }, ref) {
    return (
      <div className="relative">
        <input ref={ref} className={cn(fieldBase, !underline && "border-b-0", className)} {...props} />
        {underline && <span aria-hidden className={fieldRule} />}
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <div className="relative">
      <textarea ref={ref} className={cn(fieldBase, "resize-none", className)} {...props} />
      <span aria-hidden className={fieldRule} />
    </div>
  );
});
