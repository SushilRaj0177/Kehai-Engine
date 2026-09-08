"use client";

import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useLocale } from "@/lib/i18n";

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-2 py-6">
        <h2 className="font-display text-lg font-bold text-white">{heading}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

export default function PrivacyPage() {
  const { t } = useLocale();

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="約" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("legal.kicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("legal.title")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">{t("legal.subtitle")}</p>

        <div className="relative z-20 mt-12 space-y-5">
          <Section heading={t("legal.aboutHeading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("legal.aboutBody")}</p>
          </Section>

          <Section heading={t("legal.collectHeading")}>
            <ul className="space-y-3 text-sm leading-relaxed text-white/60">
              <li>· {t("legal.collectIdentity")}</li>
              <li>· {t("legal.collectOrg")}</li>
              <li>· {t("legal.collectLocation")}</li>
              <li>· {t("legal.collectFlags")}</li>
            </ul>
          </Section>

          <Section heading={t("legal.notCollectedHeading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("legal.notCollectedBody")}</p>
          </Section>

          <Section heading={t("legal.retentionHeading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("legal.retentionBody")}</p>
          </Section>

          <Section heading={t("legal.limitationsHeading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("legal.limitationsBody")}</p>
          </Section>

          <p className="px-1 text-xs text-white/35">{t("legal.fullDocLink")}</p>
        </div>
      </div>
    </ClickRippleLayer>
  );
}
