"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { useLocale } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <ClickRippleLayer className="relative flex min-h-screen flex-col">
      <PageGlow />
      <NavBar />
      <div className="relative z-20 mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-20">
        <EmptyState
          glyph="無"
          title={t("notFound.title")}
          description={t("notFound.description")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/">
                <Button variant="primary">{t("notFound.backHome")}</Button>
              </Link>
              <Link href="/events">
                <Button variant="secondary">{t("notFound.browseEvents")}</Button>
              </Link>
            </div>
          }
          className="w-full"
        />
      </div>
      <Footer />
    </ClickRippleLayer>
  );
}
