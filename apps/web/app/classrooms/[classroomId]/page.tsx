"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClassSessionManager } from "@/components/ClassSessionManager";
import { ClassroomRoster } from "@/components/ClassroomRoster";
import { AttendanceHeatmap } from "@/components/AttendanceHeatmap";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { useClassroom, useClassroomHeatmap, useClassroomRoster } from "@/lib/hooks";
import { subscribeToClassroom } from "@/lib/realtime";
import { useLocale } from "@/lib/i18n";

export default function ClassroomDetailPage() {
  const { t } = useLocale();
  const { classroomId } = useParams<{ classroomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentParam = searchParams.get("student") ?? undefined;

  const { data: classroom, error: classroomError, isLoading, mutate } = useClassroom(classroomId);
  const { mutate: mutateRoster } = useClassroomRoster(classroomId);
  const { data: heatmap } = useClassroomHeatmap(classroomId, classroom?.isTeacher ? studentParam : undefined);

  const [liveConnected, setLiveConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId || !classroom?.isTeacher) return;
    const unsubscribe = subscribeToClassroom(classroomId, {
      onConnectionChange: setLiveConnected,
      onJoin: (payload) => {
        setToast(t("classroomDetail.toastJoined", { name: payload.studentName }));
        void mutateRoster();
        void mutate();
      },
      onAttendanceUpdate: (payload) => {
        setToast(t("classroomDetail.toastCheckedIn", { name: payload.studentName }));
        void mutateRoster();
      },
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, classroom?.isTeacher]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (isLoading) return <LoadingBlock label={t("states.loadingClassroom")} />;

  if (classroomError || !classroom) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState title={t("classroomDetail.notFoundTitle")} description={t("classroomDetail.notFoundDescription")} />
        </div>
      </div>
    );
  }

  const viewingStudent = classroom.isTeacher && !!studentParam;

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <KanjiMark glyph="級" className="absolute -right-6 top-0 text-[5rem] sm:text-[9rem]" />

        {toast && (
          <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-kehai-500/30 bg-void-900/95 px-5 py-2.5 text-sm text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {toast}
          </div>
        )}

        <div className="relative z-20 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              {classroom.openSession && (
                <Badge status="ACTIVE">{t("classroomDetail.sessionOpenBadge")}</Badge>
              )}
              {classroom.isTeacher && (
                <LiveIndicator connected={liveConnected} />
              )}
            </div>
            <h1 className="font-display text-3xl font-black text-white md:text-4xl">{classroom.name}</h1>
            <p className="mt-2 text-base text-white/45">
              {[classroom.courseCode, classroom.semesterLabel].filter(Boolean).join(" · ")}
              {classroom.openSession && ` · ${classroom.openSession.label || t("classroomDetail.untitledSession")}`}
            </p>
          </div>

          {!classroom.isTeacher && classroom.openSession && (
            <Link href={`/classrooms/${classroomId}/checkin`}>
              <Button variant="cyan" size="lg">
                {t("classroomDetail.checkInNow")}
              </Button>
            </Link>
          )}
        </div>

        {classroom.isTeacher ? (
          <div className="relative z-20 mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t("classroomDetail.heatmapHeading")}
                </CardHeader>
                <CardBody>
                  {viewingStudent && (
                    <button
                      type="button"
                      onClick={() => router.push(`/classrooms/${classroomId}`)}
                      className="mb-4 text-sm font-medium text-kehai-400 hover:text-kehai-300"
                    >
                      {t("classroomDetail.backToClassView")}
                    </button>
                  )}
                  {heatmap ? <AttendanceHeatmap data={heatmap} /> : <LoadingBlock />}
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t("classroomDetail.rosterHeading")}
                </CardHeader>
                <CardBody>
                  <ClassroomRoster classroomId={classroomId} />
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <ClassSessionManager
                classroomId={classroomId}
                openSession={classroom.openSession}
                onSessionsChanged={() => mutate()}
              />

              <Card>
                <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t("classroomDetail.shareHeading")}
                </CardHeader>
                <CardBody>
                  <ShareJoinCode joinCode={classroom.joinCode} />
                </CardBody>
              </Card>
            </div>
          </div>
        ) : (
          <div className="relative z-20 mt-12 space-y-6">
            {!classroom.openSession && <ErrorBlock message={t("classroomDetail.noOpenSessionHint")} />}
            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {t("classroomDetail.heatmapHeading")}
              </CardHeader>
              <CardBody>{heatmap ? <AttendanceHeatmap data={heatmap} /> : <LoadingBlock />}</CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareJoinCode({ joinCode }: { joinCode?: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  if (!joinCode) return null;
  const link = typeof window !== "undefined" ? `${window.location.origin}/classrooms/join?code=${joinCode}` : "";

  function copy(text: string, which: "code" | "link") {
    void navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied((cur) => (cur === which ? null : cur)), 1800);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-white/35">{t("classroomHub.joinCodeLabel")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-kehai-500/30 bg-kehai-500/10 px-3 py-1.5 font-mono text-base font-bold tracking-[0.25em] text-kehai-300">
          {joinCode}
        </span>
        <Button variant="ghost" size="sm" onClick={() => copy(joinCode, "code")}>
          {copied === "code" ? t("classroomHub.copied") : t("classroomHub.copyCode")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => copy(link, "link")}>
          {copied === "link" ? t("classroomHub.copied") : t("classroomHub.copyLink")}
        </Button>
      </div>
    </div>
  );
}
