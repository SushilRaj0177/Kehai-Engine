import Link from "next/link";

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
    <footer className="relative bg-void-900/60">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-shu-500/50 bg-shu-500/10 font-display text-sm font-black text-shu-400">
                気
              </span>
              <span className="font-display text-sm font-bold tracking-wide text-white">
                KEHAI <span className="font-normal text-white/40">ENGINE</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-white/50">
              気配 (kehai) — a sign that someone is present, before it&apos;s seen. Attendance you can
              verify, analytics you can trust.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">{group.heading}</h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="text-[15px] text-white/60 transition-colors hover:text-shu-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col-reverse items-start gap-3 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Kehai Engine</span>
          <span className="font-mono tracking-wider">出席 · 検証 · 洞察</span>
        </div>
      </div>
    </footer>
  );
}
