"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { KanjiMark, VerticalCaption } from "@/components/ui/KanjiMark";
import { KatakanaRain } from "@/components/ui/KatakanaRain";
import { Reveal } from "@/components/ui/Reveal";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useLocale } from "@/lib/i18n";

export default function LandingPage() {
  const { t, locale, pillars, steps } = useLocale();

  return (
    <ClickRippleLayer className="relative min-h-screen overflow-hidden">
      <NavBar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-void-950" />
        <div className="absolute inset-0 bg-grid opacity-40" />
        <KatakanaRain columns={18} className="opacity-90" />
        {/* Scrim over the grid/rain layers so the hero reads as a solid
            dark panel instead of a washed-out, see-through backdrop. */}
        <div className="absolute inset-0 bg-void-950/55" />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-shu-500/[0.09] blur-[140px]"
        />

        {/* Positioned relative to this full-width section (not the centered
            max-w-7xl content column below) so it actually sits against the
            right edge of the viewport, not the right edge of a narrower
            centered container. */}
        <KanjiMark glyph="気配" prominent className="absolute -right-6 top-2 text-[13rem] md:text-[19rem]" />
        <VerticalCaption text="出席・検証・洞察" className="absolute right-10 top-14 hidden lg:block" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start px-6 py-16 md:py-20">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-shu-500/30 bg-shu-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-shu-400">
            <span className="h-1.5 w-1.5 rounded-full bg-shu-400 animate-pulseGlow" />
            {t("hero.badge")}
          </span>

          <h1
            className={`max-w-3xl font-display text-5xl font-black tracking-tight text-white md:text-7xl ${
              locale === "ja" ? "leading-[1.25]" : "leading-[1.05]"
            }`}
          >
            {t("hero.titleLine1")} <span className="text-glow text-shu-400">{t("hero.titleVerify")}</span>.
            <br />
            {t("hero.titleLine2")} <span className="text-glow-cyan text-kehai-400">{t("hero.titleTrust")}</span>.
          </h1>

          <p
            className={`mt-6 max-w-xl text-lg text-white/65 md:text-xl ${
              locale === "ja" ? "leading-loose" : "leading-relaxed"
            }`}
          >
            {t("hero.body")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">{t("hero.ctaPrimary")}</Button>
            </Link>
            <Link href="/events">
              <Button size="lg" variant="secondary">
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>

          <div className="mt-12 grid w-full grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat value="±5m" label={t("hero.statGeofence")} />
            <Stat value="20s" label={t("hero.statRotation")} />
            <Stat value="4" label={t("hero.statLayers")} />
            <Stat value="0" label={t("hero.statFabricated")} />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 py-28 md:py-36">
        <Reveal variant="curtain" className="mb-16 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">{t("pillars.kicker")}</span>
          <h2 className={`mt-3 font-display text-4xl font-bold text-white md:text-5xl ${
              locale === "ja" ? "leading-snug" : "leading-tight"
            }`}>
            {t("pillars.title")}
          </h2>
          <p className="mt-4 text-lg text-white/60">{t("pillars.subtitle")}</p>
        </Reveal>

        <div className="divide-y divide-white/[0.06]">
          {pillars.map((p, i) => (
            <Reveal key={p.glyph} delayMs={i * 80}>
              <div className="group grid gap-4 py-10 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
                <span className="cursor-default font-display text-6xl font-black leading-none text-white/[0.08] transition-all duration-500 group-hover:text-shu-400/90 group-hover:[text-shadow:0_0_50px_rgba(255,45,85,0.85),0_0_100px_rgba(255,45,85,0.4)] sm:text-7xl">
                  {p.glyph}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-white sm:text-2xl">{p.title[locale]}</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-white/60">{p.body[locale]}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-void-900/40 py-28 md:py-36">
        <KanjiMark glyph="信" accent="kehai" className="absolute -right-6 bottom-0 text-[16rem]" />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal className="mb-16 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-kehai-400">{t("flow.kicker")}</span>
            <h2 className={`mt-3 font-display text-4xl font-bold text-white md:text-5xl ${
              locale === "ja" ? "leading-snug" : "leading-tight"
            }`}>
              {t("flow.title")}
            </h2>
            <p className="mt-4 text-lg text-white/60">{t("flow.subtitle")}</p>
          </Reveal>

          <ol className="relative">
            {/* Gradient spine (shu -> kehai) instead of a flat gray line,
                plus a small glowing pulse that travels its full length on
                a loop — signal-traveling-down-a-wire, not a static rule. */}
            <div
              aria-hidden
              className="absolute bottom-8 left-[27px] top-8 w-px overflow-hidden sm:left-[35px]"
              style={{ background: "linear-gradient(to bottom, rgba(255,45,85,0.5), rgba(34,226,245,0.5))" }}
            >
              <span className="flow-pulse" />
            </div>
            {steps.map((step, i) => (
              <Reveal key={step.en} delayMs={i * 90}>
                <li className="group relative flex items-start gap-6 py-8 sm:gap-9">
                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-void-950 ring-1 ring-white/10 transition-all duration-300 group-hover:scale-110 group-hover:ring-shu-400/50 sm:h-[70px] sm:w-[70px]">
                    <span
                      className="font-display text-3xl font-black leading-none sm:text-4xl"
                      style={{
                        backgroundImage: `linear-gradient(135deg, rgba(255,92,115,1), rgba(95,244,255,${0.5 + i * 0.1}))`,
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        color: "transparent",
                        filter: "drop-shadow(0 0 14px rgba(255,45,85,0.35))",
                      }}
                    >
                      {i + 1}
                    </span>
                  </span>
                  <span className="mt-3 text-lg leading-relaxed text-white/75 transition-colors duration-300 group-hover:text-white sm:mt-5 sm:text-xl">
                    {step[locale]}
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <Footer />
    </ClickRippleLayer>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
