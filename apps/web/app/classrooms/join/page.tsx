"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { JoinClassroomForm } from "@/components/JoinClassroomForm";
import { useLocale } from "@/lib/i18n";

export default function ClassroomJoinLandingPage() {
  const { t } = useLocale();
  const search = useSearchParams();
  const router = useRouter();
  const code = search.get("code") ?? "";

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-xl flex-col justify-center px-6 py-16">
        <KanjiMark glyph="級" className="absolute -right-6 top-0 text-[7rem] sm:-right-10 sm:text-[12rem]" />

        <span className="relative z-20 text-xs font-semibold uppercase tracking-widest text-shu-400">
          {t("classroomJoinPage.kicker")}
        </span>
        <h1 className="relative z-20 mt-3 font-display text-4xl font-black text-white md:text-5xl">
          {t("classroomJoinPage.title")}
        </h1>
        <p className="relative z-20 mt-3 text-lg text-white/50">{t("classroomJoinPage.subtitle")}</p>

        <Card className="relative z-20 mt-12">
          <CardBody>
            <JoinClassroomForm initialCode={code} onJoined={(result) => router.push(`/classrooms/${result.classroom.id}`)} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
