"use client";

import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { LoadingBlock } from "@/components/ui/States";
import { useAuditChainStatus } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
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

function ChainVerification() {
  const { t, locale } = useLocale();
  const { data, error, isLoading } = useAuditChainStatus();

  return (
    <Card>
      <CardBody className="space-y-3 py-6">
        <h2 className="font-display text-lg font-bold text-white">{t("trust.verifyHeading")}</h2>
        <p className="text-sm leading-relaxed text-white/60">{t("trust.verifyBody")}</p>

        {isLoading ? (
          <LoadingBlock label={t("trust.verifyLoading")} />
        ) : error || !data ? (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
            {t("trust.verifyError")}
          </p>
        ) : (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              data.valid
                ? "border-kehai-400/25 bg-kehai-400/[0.06] text-kehai-200"
                : "border-shu-500/30 bg-shu-500/[0.08] text-shu-300"
            }`}
          >
            <p className="flex items-center gap-2 font-medium">
              <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${data.valid ? "bg-kehai-400" : "bg-shu-400"}`} />
              {data.valid
                ? t("trust.verifyValid", { count: data.rowsChecked })
                : t("trust.verifyBroken", { id: data.brokenAtId ?? "?" })}
            </p>
            <p className="mt-1.5 text-xs text-white/40">{t("trust.verifyCheckedAt", { time: formatDateTime(new Date(data.checkedAt), locale) })}</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function TrustPage() {
  const { t } = useLocale();

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <KanjiMark glyph="信" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">{t("trust.kicker")}</span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("trust.title")}</h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">{t("trust.subtitle")}</p>

        <div className="relative z-20 mt-12 space-y-5">
          <Section heading={t("trust.honestyHeading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("trust.honestyBody")}</p>
          </Section>

          <Section heading={t("trust.point1Heading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("trust.point1Body")}</p>
          </Section>

          <Section heading={t("trust.point2Heading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("trust.point2Body")}</p>
          </Section>

          <ChainVerification />

          <Section heading={t("trust.point3Heading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("trust.point3Body")}</p>
          </Section>

          <Section heading={t("trust.point4Heading")}>
            <p className="text-sm leading-relaxed text-white/60">
              {t("trust.point4Body")}{" "}
              <a
                href="https://github.com/SushilRaj0177/Kehai-Engine"
                target="_blank"
                rel="noopener noreferrer"
                className="text-kehai-400 underline decoration-kehai-400/30 underline-offset-2 hover:text-kehai-300"
              >
                github.com/SushilRaj0177/Kehai-Engine
              </a>
            </p>
          </Section>

          <Section heading={t("trust.point5Heading")}>
            <p className="text-sm leading-relaxed text-white/60">{t("trust.point5Body")}</p>
          </Section>
        </div>
      </div>
    </ClickRippleLayer>
  );
}
