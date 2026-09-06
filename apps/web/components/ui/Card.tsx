import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Softer, thinner border and a touch more radius so panels read as
        // gently separated surfaces rather than boxed containers; the old
        // border-white/10 + tight padding is exactly the "enclosed" feeling
        // that was called out — this opens each panel up without losing
        // the panel entirely (data-dense areas like tables still need one).
        "rounded-2xl border border-white/[0.07] bg-void-800/50 backdrop-blur-sm",
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
