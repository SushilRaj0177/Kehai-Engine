import { cn } from "@/lib/cn";

/**
 * Replaces a plain 1px border/hairline between sections. A gradient trace
 * with pulsing nodes and a traveling dashed signal — reads as "circuit",
 * not "default CSS divider."
 */
export function CircuitDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("h-px w-full", className)}>
      <svg
        viewBox="0 0 1200 2"
        preserveAspectRatio="none"
        className="h-6 w-full -translate-y-1/2 overflow-visible"
      >
        <line x1="0" y1="1" x2="1200" y2="1" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
        <line
          x1="0"
          y1="1"
          x2="1200"
          y2="1"
          stroke="rgba(255,92,115,0.55)"
          strokeWidth="1"
          className="dash-travel"
        />
        {[120, 420, 780, 1080].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy="1"
            r="2.4"
            fill={i % 2 === 0 ? "#ff5c73" : "#5ff4ff"}
            className="node-pulse"
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}
      </svg>
    </div>
  );
}
