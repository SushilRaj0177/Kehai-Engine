import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Real glassmorphism — genuinely translucent (not just a dark flat
        // fill with a hairline) with visible blur, a soft ambient shadow
        // standing in for depth, and a border that actually brightens on
        // hover instead of staying a near-invisible 7% line always.
        "rounded-2xl border border-white/[0.09] bg-white/[0.04] backdrop-blur-xl transition-colors",
        "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
        "hover:border-white/[0.16]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-white/[0.06] px-6 py-5", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}
