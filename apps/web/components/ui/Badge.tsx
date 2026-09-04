import { cn } from "@/lib/cn";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-white/8 text-white/60 border-white/15",
  PUBLISHED: "bg-kehai-500/10 text-kehai-400 border-kehai-500/30",
  ACTIVE: "bg-shu-500/15 text-shu-400 border-shu-500/40 animate-pulseGlow",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  CANCELLED: "bg-white/5 text-white/35 border-white/10 line-through",
  high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-gold-500/10 text-gold-400 border-gold-500/30",
  low: "bg-shu-500/10 text-shu-400 border-shu-500/30",
};

export function Badge({ status, children, className }: { status?: string; children: React.ReactNode; className?: string }) {
  const style = status ? statusStyles[status] ?? "bg-white/8 text-white/60 border-white/15" : "bg-white/8 text-white/70 border-white/15";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        style,
        className
      )}
    >
      {children}
    </span>
  );
}
