"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useLocale } from "@/lib/i18n";

export default function UnsubscribedPage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const failed = searchParams.get("status") === "invalid";

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-lg flex-col justify-center px-6 py-16 text-center">
        <KanjiMark glyph="配" className="absolute -right-6 top-0 text-[6rem] sm:text-[10rem]" />
        <Card className="relative z-20">
          <CardBody className="py-10">
            <p className="font-display text-lg font-semibold text-white">
              {failed ? t("unsubscribed.failedTitle") : t("unsubscribed.title")}
            </p>
            <p className="mt-2 text-sm text-white/55">
              {failed ? t("unsubscribed.failedBody") : t("unsubscribed.body")}
            </p>
            <Link href="/" className="mt-6 inline-block">
              <Button variant="secondary">{t("unsubscribed.backHome")}</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </ClickRippleLayer>
  );
}
