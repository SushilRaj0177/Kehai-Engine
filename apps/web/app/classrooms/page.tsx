"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TiltCard } from "@/components/ui/TiltCard";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/ui/States";
import { KanjiMark } from "@/components/ui/KanjiMark";
import { PageGlow } from "@/components/ui/PageGlow";
import { JoinClassroomForm } from "@/components/JoinClassroomForm";
import { useAuth } from "@/lib/auth-context";
import { useMyClassrooms, useEnrolledClassrooms } from "@/lib/hooks";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/i18n";

export default function ClassroomsHubPage() {
  const { t } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { data: teaching, isLoading: teachingLoading, mutate: mutateTeaching } = useMyClassrooms();
  const { data: enrolled, isLoading: enrolledLoading, mutate: mutateEnrolled } = useEnrolledClassrooms();
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  if (authLoading) return <LoadingBlock label={t("states.checkingSession")} />;

  if (!user) {
    return (
      <div className="relative min-h-screen">
        <PageGlow />
        <NavBar />
        <div className="relative mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-white/60">{t("dashboard.signInPrompt")}</p>
          <Link href="/login">
            <Button className="mt-4">{t("common.signIn")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  function copy(text: string, id: string) {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
  }

  return (
    <div className="relative min-h-screen">
      <PageGlow />
      <NavBar />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <KanjiMark glyph="級" className="absolute -right-4 top-0 text-[6rem] sm:text-[10rem]" />
        <div className="relative z-20 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">{t("classroomHub.kicker")}</span>
            <h1 className="mt-3 font-display text-4xl font-black text-white md:text-5xl">{t("classroomHub.title")}</h1>
            <p className="mt-3 max-w-xl text-lg text-white/50">{t("classroomHub.subtitle")}</p>
          </div>
          <Button size="lg" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? t("common.cancel") : t("classroomHub.newClassroom")}
          </Button>
        </div>

        {showCreate && (
          <CreateClassroomForm
            onCreated={() => {
              setShowCreate(false);
              void mutateTeaching();
            }}
          />
        )}

        <div className="relative z-20 mt-14">
          <Card>
            <CardBody>
              <h2 className="mb-1 font-display text-lg font-bold text-white/85">{t("classroomHub.joinHeading")}</h2>
              <p className="mb-4 text-sm text-white/45">{t("classroomHub.joinSubtitle")}</p>
              <JoinClassroomForm
                onJoined={(result) => {
                  void mutateEnrolled();
                  router.push(`/classrooms/${result.classroom.id}`);
                }}
              />
            </CardBody>
          </Card>
        </div>

        <div className="relative z-20 mt-16">
          <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("classroomHub.teachingHeading")}</h2>
          {teachingLoading ? (
            <LoadingBlock />
          ) : !teaching?.length ? (
            <EmptyState
              glyph="級"
              title={t("classroomHub.teachingEmptyTitle")}
              description={t("classroomHub.teachingEmptyDescription")}
              action={<Button onClick={() => setShowCreate(true)}>{t("classroomHub.newClassroom")}</Button>}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teaching.map((c) => {
                const joinLink = typeof window !== "undefined" ? `${window.location.origin}/classrooms/join?code=${c.joinCode}` : "";
                return (
                  <TiltCard key={c.id} className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <Link href={`/classrooms/${c.id}`} className="block">
                          <h3 className="font-display text-base font-bold leading-snug text-white">{c.name}</h3>
                          <p className="mt-1 text-sm text-white/40">
                            {[c.courseCode, c.semesterLabel].filter(Boolean).join(" · ") || " "}
                          </p>
                          <div className="mt-4 flex items-center gap-4 text-sm text-white/50">
                            <span>{t("classroomHub.studentCount", { count: c.studentCount })}</span>
                            <span>{t("classroomHub.sessionCount", { count: c.sessionCount })}</span>
                          </div>
                        </Link>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                          <span className="rounded-full border border-kehai-500/30 bg-kehai-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-[0.2em] text-kehai-300">
                            {c.joinCode}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              copy(c.joinCode, `${c.id}-code`);
                            }}
                            className="text-xs font-medium text-white/45 hover:text-white/80"
                          >
                            {copiedId === `${c.id}-code` ? t("classroomHub.copied") : t("classroomHub.copyCode")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              copy(joinLink, `${c.id}-link`);
                            }}
                            className="text-xs font-medium text-white/45 hover:text-white/80"
                          >
                            {copiedId === `${c.id}-link` ? t("classroomHub.copied") : t("classroomHub.copyLink")}
                          </button>
                        </div>
                      </CardBody>
                    </Card>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative z-20 mt-16">
          <h2 className="mb-6 font-display text-xl font-bold text-white/70">{t("classroomHub.enrolledHeading")}</h2>
          {enrolledLoading ? (
            <LoadingBlock />
          ) : !enrolled?.length ? (
            <EmptyState glyph="学" title={t("classroomHub.enrolledEmptyTitle")} description={t("classroomHub.enrolledEmptyDescription")} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {enrolled.map((e) => (
                <Link key={e.classroom.id} href={`/classrooms/${e.classroom.id}`}>
                  <TiltCard className="h-full rounded-2xl">
                    <Card className="h-full transition-colors hover:border-shu-500/30">
                      <CardBody className="relative z-10 py-6">
                        <h3 className="font-display text-base font-bold leading-snug text-white">{e.classroom.name}</h3>
                        <p className="mt-1 text-sm text-white/40">
                          {[e.classroom.courseCode, e.classroom.semesterLabel].filter(Boolean).join(" · ") || " "}
                        </p>
                        <p className="mt-1 text-sm text-white/35">{t("classroomHub.teacherLabel", { name: e.classroom.teacherName })}</p>
                        <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4 text-sm">
                          <span className="text-kehai-400">{Math.round(e.attendanceRate * 100)}% {t("classroomHub.attendanceRate")}</span>
                          <span className="flex items-center gap-1 text-shu-400">
                            🔥 {e.currentStreak}
                          </span>
                        </div>
                      </CardBody>
                    </Card>
                  </TiltCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateClassroomForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("");
  const [enableGeofence, setEnableGeofence] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const classroom = await apiFetch<{ id: string }>("/api/classrooms", {
        method: "POST",
        body: JSON.stringify({
          name,
          courseCode: courseCode || undefined,
          semesterLabel: semesterLabel || undefined,
          latitude: enableGeofence && latitude ? Number(latitude) : undefined,
          longitude: enableGeofence && longitude ? Number(longitude) : undefined,
          geofenceRadiusM: enableGeofence && radius ? Number(radius) : undefined,
        }),
      });
      onCreated();
      router.push(`/classrooms/${classroom.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomHub.createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative z-20 mt-6">
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor="classroom-name">{t("classroomHub.nameLabel")}</Label>
              <Input id="classroom-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("classroomHub.namePlaceholder")} />
            </div>
            <div>
              <Label htmlFor="classroom-course">{t("classroomHub.courseCodeLabel")}</Label>
              <Input id="classroom-course" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder={t("classroomHub.courseCodePlaceholder")} />
            </div>
            <div>
              <Label htmlFor="classroom-semester">{t("classroomHub.semesterLabelLabel")}</Label>
              <Input id="classroom-semester" value={semesterLabel} onChange={(e) => setSemesterLabel(e.target.value)} placeholder={t("classroomHub.semesterPlaceholder")} />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={enableGeofence}
                onChange={(e) => setEnableGeofence(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 accent-kehai-500"
              />
              {t("classroomHub.enableGeofence")}
            </label>
            <p className="mt-1.5 text-[11px] text-white/35">{t("classroomHub.geofenceHelp")}</p>

            {enableGeofence && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{t("classroomHub.geofenceHeading")}</span>
                  <button type="button" onClick={useMyLocation} className="text-xs font-medium text-shu-400 hover:text-shu-300">
                    {locating ? t("classroomHub.locating") : t("classroomHub.useMyLocation")}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="classroom-lat">{t("classroomHub.latitudeLabel")}</Label>
                    <Input id="classroom-lat" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="classroom-lng">{t("classroomHub.longitudeLabel")}</Label>
                    <Input id="classroom-lng" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="classroom-radius">{t("classroomHub.radiusLabel")}</Label>
                    <Input id="classroom-radius" type="number" min={10} max={5000} value={radius} onChange={(e) => setRadius(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading}>
              {t("common.create")}
            </Button>
          </div>
          {error && <ErrorBlock message={error} />}
        </form>
      </CardBody>
    </Card>
  );
}
