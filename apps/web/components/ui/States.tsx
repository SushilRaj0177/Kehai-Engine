"use client";

import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n";

export function LoadingBlock({ label, className }: { label?: string; className?: string }) {
  const { t } = useLocale();
  return (
    <div className={cn("flex items-center justify-center gap-3 py-16 text-white/40", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-shu-500/70 border-t-transparent" />
      <span className="text-sm font-mono tracking-wide">{label ?? t("common.loading")}</span>
    </div>
  );
}

export function ErrorBlock({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-shu-500/30 bg-shu-500/5 px-4 py-3 text-sm text-shu-300", className)}>
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  glyph = "無",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  glyph?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/[0.06] bg-void-800/30 px-8 py-20 text-center", className)}>
      <span aria-hidden className="absolute -right-4 -top-6 select-none font-display text-[10rem] font-black text-white/[0.03]">
        {glyph}
      </span>
      <p className="relative font-display text-2xl font-bold text-white/85">{title}</p>
      {description ? <p className="relative mx-auto mt-3 max-w-md text-base text-white/45">{description}</p> : null}
      {action ? <div className="relative mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}
