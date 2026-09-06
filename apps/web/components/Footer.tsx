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

const MARQUEE_ITEM = "気配 KEHAI ENGINE — 出席・検証・洞察 —";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-void-900/60">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-16 select-none font-display text-[14rem] font-black leading-none text-white/[0.025]"
      >
        気配
      </span>

      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-14 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="group flex items-center gap-2.5">
              <span className="font-display text-2xl font-black leading-none text-shu-400 transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_22px_rgba(255,45,85,0.65)]">
                気
              </span>
              <span className="font-display text-base font-bold tracking-wide text-white">
                KEHAI <span className="font-normal text-white/40">ENGINE</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-base leading-relaxed text-white/50">
              気配 (kehai) — a sign that someone is present, before it&apos;s seen. Attendance you can
              verify, analytics you can trust.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">{group.heading}</h3>
              <ul className="mt-5 space-y-3.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="group relative inline-block text-base text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-shu-400 to-kehai-400 transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative mt-16 flex flex-col-reverse items-start gap-4 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            © {new Date().getFullYear()} Kehai Engine
          </span>
        </div>
      </div>

      {/* Slow marquee strip — brand phrase drifting continuously, edge to
          edge; content is duplicated so the loop is seamless (same trick
          as KatakanaRain: translate exactly -50% of the doubled width). */}
      <div aria-hidden className="relative overflow-hidden border-t border-white/[0.06] py-4">
        <div className="marquee-track flex w-max whitespace-nowrap font-mono text-xs tracking-[0.3em] text-white/20">
          <span className="px-4">
            {Array.from({ length: 8 }, () => MARQUEE_ITEM).join(" ")}
          </span>
          <span className="px-4">
            {Array.from({ length: 8 }, () => MARQUEE_ITEM).join(" ")}
          </span>
        </div>
      </div>
    </footer>
  );
}
