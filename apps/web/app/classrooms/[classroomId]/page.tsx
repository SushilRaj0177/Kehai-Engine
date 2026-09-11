"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { LoadingBlock, ErrorBlock, EmptyState } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { ClickRippleLayer } from "@/components/ui/ClickRipple";
import { ClassSessionManager } from "@/components/ClassSessionManager";
import { ClassroomRoster } from "@/components/ClassroomRoster";
import { ClassroomExportButtons } from "@/components/ExportButtons";
import { AtRiskStudents } from "@/components/AtRiskStudents";
import { MyAttendanceHistory } from "@/components/MyAttendanceHistory";
import { AttendanceHeatmap } from "@/components/AttendanceHeatmap";
import { SessionTrendChart } from "@/components/charts/SessionTrendChart";
import { LiveIndicator } from "@/components/ui/LiveIndicator";
import { useClassroom, useClassroomHeatmap, useClassroomRoster, useClassroomSessions } from "@/lib/hooks";
import { subscribeToClassroom } from "@/lib/realtime";
import { apiFetch, ApiError } from "@/lib/api";
import type { ClassroomDetail } from "@/lib/types";
import { useLocale } from "@/lib/i18n";

export default function ClassroomDetailPage() {
  const { t } = useLocale();
  const { classroomId } = useParams<{ classroomId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentParam = searchParams.get("student") ?? undefined;

  const { data: classroom, error: classroomError, isLoading, mutate } = useClassroom(classroomId);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const { mutate: mutateRoster } = useClassroomRoster(classroomId);
  const { data: heatmap } = useClassroomHeatmap(classroomId, classroom?.isTeacher ? studentParam : undefined);
  const { data: sessions } = useClassroomSessions(classroom?.isTeacher ? classroomId : undefined);

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

  async function leaveClassroom() {
    if (!confirmingLeave) {
      setLeaveError(null);
      setConfirmingLeave(true);
      return;
    }
    setLeaveError(null);
    setLeaving(true);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/enrollment`, { method: "DELETE" });
      router.push("/classrooms");
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : t("classroomDetail.leaveError"));
    } finally {
      setLeaving(false);
    }
  }

  if (isLoading) return <LoadingBlock label={t("states.loadingClassroom")} />;

  if (classroomError || !classroom) {
    return (
      <ClickRippleLayer className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24">
          <EmptyState title={t("classroomDetail.notFoundTitle")} description={t("classroomDetail.notFoundDescription")} />
        </div>
      </ClickRippleLayer>
    );
  }

  const viewingStudent = classroom.isTeacher && !!studentParam;

  return (
    <ClickRippleLayer className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <KanjiMark glyph="級" className="absolute -right-6 top-0 text-[5rem] sm:text-[9rem]" />

        {toast && (
          <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-kehai-500/30 bg-void-900/95 px-5 py-2.5 text-sm text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {toast}
          </div>
        )}

        <Link
          href="/classrooms"
          className="relative z-20 mb-5 inline-block text-sm font-medium text-white/45 transition-colors hover:text-white/80"
        >
          {t("classroomDetail.backToClassrooms")}
        </Link>

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
            {classroom.isTeacher && (
              <div className="mt-3">
                <EditClassroomDetailsPanel classroom={classroom} onSaved={() => mutate()} />
              </div>
            )}
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
          <div className="relative z-20 mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
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

              {!viewingStudent && (
                <Card>
                  <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {t("classroomDetail.trendHeading")}
                  </CardHeader>
                  <CardBody>
                    {sessions ? (
                      <SessionTrendChart sessions={sessions} studentCount={classroom.studentCount} />
                    ) : (
                      <LoadingBlock />
                    )}
                  </CardBody>
                </Card>
              )}

              <Card id="roster">
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {t("classroomDetail.rosterHeading")}
                  </span>
                  <ClassroomExportButtons classroomId={classroomId} />
                </CardHeader>
                <CardBody>
                  <ClassroomRoster classroomId={classroomId} openSessionId={classroom.openSession?.id} />
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <ClassSessionManager
                classroomId={classroomId}
                openSession={classroom.openSession}
                onSessionsChanged={() => mutate()}
              />

              <AtRiskStudents classroomId={classroomId} />

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

            <Card>
              <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {t("classroomDetail.myAttendanceHeading")}
              </CardHeader>
              <CardBody>
                <MyAttendanceHistory classroomId={classroomId} />
              </CardBody>
            </Card>

            <Card className="border-shu-500/20">
              <CardBody className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-white/85">{t("classroomDetail.leaveClassroomLabel")}</p>
                  <p className="mt-1 text-xs text-white/40">{t("classroomDetail.leaveClassroomHint")}</p>
                </div>
                {leaveError && <ErrorBlock message={leaveError} />}
                {confirmingLeave ? (
                  <div className="flex items-center gap-3">
                    <Button variant="danger" size="sm" loading={leaving} onClick={leaveClassroom}>
                      {t("classroomDetail.confirmLeave")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingLeave(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button variant="danger" size="sm" onClick={leaveClassroom}>
                    {t("classroomDetail.leaveClassroomLabel")}
                  </Button>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </ClickRippleLayer>
  );
}

// Name, course code, and semester label were all editable through the API
// (updateClassroomSchema covers them) but had no UI — a teacher who typo'd
// the classroom name or is reusing it for a new semester had no path short
// of calling the API directly. Geofence lat/long/radius stay out of scope,
// same reasoning as the event edit panel: relocating where check-in is
// physically anchored deserves the map picker the creation form has.
function EditClassroomDetailsPanel({ classroom, onSaved }: { classroom: ClassroomDetail; onSaved: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(classroom.name);
  const [courseCode, setCourseCode] = useState(classroom.courseCode ?? "");
  const [semesterLabel, setSemesterLabel] = useState(classroom.semesterLabel ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle() {
    setOpen((o) => !o);
    setError(null);
    setSaved(false);
    setName(classroom.name);
    setCourseCode(classroom.courseCode ?? "");
    setSemesterLabel(classroom.semesterLabel ?? "");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/classrooms/${classroom.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, courseCode: courseCode.trim() || null, semesterLabel: semesterLabel.trim() || null }),
      });
      onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.editError"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={toggle}>
        {t("classroomDetail.editDetails")}
      </Button>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardBody className="space-y-4">
        <div>
          <Label htmlFor="edit-classroom-name">{t("classroomHub.nameLabel")}</Label>
          <Input id="edit-classroom-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="edit-classroom-course">{t("classroomHub.courseCodeLabel")}</Label>
            <Input id="edit-classroom-course" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-classroom-semester">{t("classroomHub.semesterLabelLabel")}</Label>
            <Input id="edit-classroom-semester" value={semesterLabel} onChange={(e) => setSemesterLabel(e.target.value)} />
          </div>
        </div>
        {error && <ErrorBlock message={error} />}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" loading={saving} onClick={save}>
            {t("classroomDetail.saveChanges")}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggle}>
            {t("common.cancel")}
          </Button>
          {saved && <span className="text-sm text-kehai-400">✓ {t("classroomDetail.editSaved")}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function ShareJoinCode({ joinCode }: { joinCode?: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  if (!joinCode) return null;
  const link = typeof window !== "undefined" ? `${window.location.origin}/classrooms/join?code=${joinCode}` : "";

  function copy(text: string, which: "code" | "link") {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(which))
      .catch(() => setCopied(null));
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
