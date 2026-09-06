"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n";

export function Footer() {
  const { t, locale } = useLocale();

  const linkGroups: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      heading: t("footer.platform"),
      links: [
        { label: t("footer.discoverEvents"), href: "/events" },
        { label: t("footer.organizerConsole"), href: "/dashboard" },
        { label: t("footer.signIn"), href: "/login" },
      ],
    },
    {
      heading: t("footer.project"),
      links: [
        { label: t("footer.source"), href: "https://github.com/SushilRaj0177/Kehai-Engine", external: true },
        { label: t("footer.reportIssue"), href: "https://github.com/SushilRaj0177/Kehai-Engine/issues", external: true },
      ],
    },
  ];

  const marqueeItem = locale === "ja" ? "気配 KEHAI ENGINE — 出席・検証・洞察 —" : "気配 KEHAI ENGINE — presence, verified —";

  return (
    // Matches the flow section's own bg-void-900/40 immediately above it —
    // this was bg-void-900/60, and that opacity mismatch created a visible
    // seam exactly at the boundary between the two sections.
    <footer className="relative overflow-hidden bg-void-900/40">
      {/* text-[14rem] (224px) unconditionally meant this two-character
          watermark was ~450px wide — wider than the entire mobile viewport
          — and the footer's own overflow-hidden was chopping it off hard
          mid-stroke, which read as a cropping rectangle rather than an
          intentional edge bleed. Shrinking it below sm keeps the same
          bleed-off-the-corner look at a size that actually fits.
          The vertical offset was also the negative -top-16/-top-6, which
          pushed the character's own top edge above the footer's box and
          let the footer's overflow-hidden hard-clip it — a flat cut
          straight through the glyph, on both mobile and desktop. top-0
          keeps the full character intact; the left bleed (an intentional,
          much gentler crop off just the left edge) is unaffected. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 top-0 select-none font-display text-[6rem] font-black leading-none text-white/[0.045] sm:-left-10 sm:right-auto sm:text-[14rem] sm:text-white/[0.025]"
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
            <p className={`mt-5 max-w-xs font-display text-base text-white/50 ${locale === "ja" ? "leading-loose" : "leading-relaxed"}`}>
              {t("footer.tagline")}
            </p>
          </div>

          {linkGroups.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">{group.heading}</h3>
              <ul className="mt-5 space-y-3.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="group relative inline-block font-display text-base text-white/60 transition-colors hover:text-white"
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
          <span className="flex items-center gap-2 font-display">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            © {new Date().getFullYear()} {t("footer.copyright")}
          </span>
        </div>
      </div>

      {/* Slow marquee strip — brand phrase drifting continuously, edge to
          edge; content is duplicated so the loop is seamless (same trick
          as KatakanaRain: translate exactly -50% of the doubled width).
          font-display, not font-mono — the mono face has no CJK glyphs, so
          気配/出席 etc. were silently falling back to a thin, barely-visible
          system CJK font here. */}
      <div aria-hidden className="relative overflow-hidden border-t border-white/[0.06] py-4">
        <div className="marquee-track flex w-max whitespace-nowrap font-display text-xs font-medium tracking-[0.3em] text-white/20">
          <span className="px-4">{Array.from({ length: 8 }, () => marqueeItem).join(" ")}</span>
          <span className="px-4">{Array.from({ length: 8 }, () => marqueeItem).join(" ")}</span>
        </div>
      </div>
    </footer>
  );
}
