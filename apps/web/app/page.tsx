"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { KanjiMark, VerticalCaption } from "@/components/ui/KanjiMark";
import { KatakanaRain } from "@/components/ui/KatakanaRain";
import { Reveal } from "@/components/ui/Reveal";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { StarField } from "@/components/ui/StarField";
import { useLocale } from "@/lib/i18n";

// Base (static) transform per glow blob — scroll-driven parallax offset
// gets appended to these at runtime, never replaces them.
const GLOW_BASE_TRANSFORMS = ["translate(-50%, -10%)", "translate(25%, 0)", "translate(-33%, 0)", "translate(25%, 0)", "translate(-25%, 0)"];
const GLOW_PARALLAX_SPEED = [0.12, 0.22, 0.18, 0.28, 0.25];

export default function LandingPage() {
  const { t, locale, pillars, steps } = useLocale();
  const glowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    function apply() {
      const y = window.scrollY;
      glowRefs.current.forEach((el, i) => {
        if (!el) return;
        // Clamped, not just `y * speed` — on a page this tall, an
        // unbounded offset drags a blob hundreds of px away from the
        // top-X% position it was placed at by the time you've scrolled
        // anywhere near it, which is exactly why the footer's red/cyan
        // pair went invisible at the bottom of the page even though they
        // showed up fine partway down. Capping it keeps the parallax feel
        // near the top of the page without derailing anything below it.
        const offset = Math.min(y * GLOW_PARALLAX_SPEED[i], 90);
        el.style.transform = `${GLOW_BASE_TRANSFORMS[i]} translateY(${offset}px)`;
      });
      raf = 0;
    }
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    }
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ClickRippleLayer className="relative min-h-screen overflow-hidden">
      {/* Ambient background spanning the whole page, not just the hero —
          sized to the full document height (absolute + inset-0 against
          this root, which is exactly as tall as all the sections below
          combined) so the red/cyan glow keeps showing up as you scroll
          instead of vanishing the moment the hero ends. Base color first,
          then several glow blobs distributed at different heights down
          the page rather than one blob that only reaches the top. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-void-900" />
        {/* Top blob centered right at the very top edge (was shifted up by
            translate-y-1/3, which pushed its brightest point above y:0 and
            left a dim/seam-looking strip right where the page starts —
            fixed by centering it at the top instead of past it). Each blob's
            transform is fully JS-managed (base offset + scroll parallax) so
            no Tailwind transform utility classes here — they'd fight the
            inline style the scroll handler sets. */}
        <div
          ref={(el) => { glowRefs.current[0] = el; }}
          className="absolute left-1/2 top-0 h-[620px] w-[1000px] rounded-full bg-shu-500/[0.14] blur-[160px]"
        />
        {/* Pillars-section glow — widened and brightened (was too dim/narrow
            to register against that section's plain background). */}
        <div
          ref={(el) => { glowRefs.current[1] = el; }}
          className="absolute right-0 top-[28%] h-[500px] w-[750px] rounded-full bg-kehai-500/[0.10] blur-[150px]"
        />
        <div
          ref={(el) => { glowRefs.current[2] = el; }}
          className="absolute left-0 top-[62%] h-[500px] w-[600px] rounded-full bg-shu-500/[0.07] blur-[150px]"
        />
        <div
          ref={(el) => { glowRefs.current[3] = el; }}
          className="absolute right-0 top-[88%] h-[500px] w-[650px] rounded-full bg-kehai-500/[0.16] blur-[130px]"
        />
        {/* Mirrors the blob above on the left, same size/brightness, so the
            flow/footer area reads as a matched red+cyan pair instead of
            cyan-only — bumped from 0.07 to 0.16 (matching the blob above)
            since 0.07 was too faint to register as a visible glow at all
            against this section's dark background, unlike the right side
            which reads brighter only because of the teal kanji watermark
            sitting on top of it, not the blob itself. */}
        <div
          ref={(el) => { glowRefs.current[4] = el; }}
          className="absolute left-0 top-[88%] h-[500px] w-[650px] rounded-full bg-shu-500/[0.16] blur-[130px]"
        />

        {/* Katakana rain + starfield live here (not inside the hero section
            below) specifically so they start at the true top of the page —
            nested inside the hero section, they'd only begin after the
            NavBar's own flow height (~80px), reading as "dropping in from a
            border" partway down instead of being there from y:0. Height is
            capped and mask-faded at the bottom so it tapers into the
            pillars section instead of hard-cutting at the hero's edge. */}
        <div
          className="absolute inset-x-0 top-0 h-[1050px] overflow-hidden"
          style={{
            maskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 65%, transparent 100%)",
          }}
        >
          <StarField count={50} />
          <KatakanaRain columns={18} className="opacity-90" />
        </div>
      </div>

      <div className="relative z-10">
      <NavBar />

      <section className="relative overflow-hidden">
        {/* Grid + scrim faded in/out at the top and bottom instead of a hard
            inset-0 rectangle — an unmasked scrim clipped exactly to this
            section's box created a visible seam right where it started
            (behind the navbar) and another where it ended (into the pillars
            section), since only this box got the extra darkening on top of
            the page-wide ambient layer. Fading both edges blends it into
            the surrounding background instead of hard-cutting. */}
        <div
          className="absolute inset-0"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0, black 120px, black calc(100% - 140px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 120px, black calc(100% - 140px), transparent 100%)",
          }}
        >
          <div className="absolute inset-0 bg-grid opacity-40" />
          {/* Scrim over the grid/rain layers so the hero reads as a solid
              dark panel instead of a washed-out, see-through backdrop —
              lightened from /55 to /45 for a slightly brighter overall feel. */}
          <div className="absolute inset-0 bg-void-950/45" />
        </div>

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
              locale === "ja" ? "leading-[1.45]" : "leading-[1.05]"
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

          <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
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
              locale === "ja" ? "leading-[1.65]" : "leading-tight"
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
              locale === "ja" ? "leading-[1.65]" : "leading-tight"
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
      </div>
    </ClickRippleLayer>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 py-4 backdrop-blur-xl transition-colors hover:border-white/[0.18]">
      <div className="font-display text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
