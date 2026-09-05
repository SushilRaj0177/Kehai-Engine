import Link from "next/link";
import { CircuitDivider } from "./ui/CircuitDivider";

const LINK_GROUPS: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Discover events", href: "/events" },
      { label: "Organizer console", href: "/dashboard" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    heading: "Project",
    links: [
      { label: "Source", href: "https://github.com/SushilRaj0177/Kehai-Engine", external: true },
      { label: "Report an issue", href: "https://github.com/SushilRaj0177/Kehai-Engine/issues", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative">
      <CircuitDivider />
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-shu-500/50 bg-shu-500/10 font-display text-sm font-black text-shu-400">
                気
              </span>
              <span className="font-display text-sm font-bold tracking-wide text-white">
                KEHAI <span className="font-normal text-white/40">ENGINE</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/40">
              気配 (kehai) — a sign that someone is present, before it's seen. Attendance you can verify,
              analytics you can trust.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{group.heading}</h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-[13px] text-white/50 transition-colors hover:text-shu-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col-reverse items-start gap-3 border-t border-white/[0.06] pt-6 text-[11px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Kehai Engine</span>
          <span className="font-mono tracking-wider">出席 · 検証 · 洞察</span>
        </div>
      </div>
    </footer>
  );
}
