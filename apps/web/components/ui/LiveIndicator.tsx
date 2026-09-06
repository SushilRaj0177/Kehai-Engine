import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n";

/** Realtime socket connection state — a small dot plus label, not a pill. */
export function LiveIndicator({ connected }: { connected: boolean }) {
  const { t } = useLocale();
  return (
    <span className={cn("flex items-center gap-1.5 text-xs", connected ? "text-emerald-400" : "text-white/30")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400 animate-pulseGlow" : "bg-white/30")} />
      {connected ? t("eventControl.live") : t("eventControl.polling")}
    </span>
  );
}
