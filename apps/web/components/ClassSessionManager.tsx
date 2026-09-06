"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Card, CardBody, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { ClassSessionQrPanel } from "./ClassSessionQrPanel";
import { useClassroomSessions } from "@/lib/hooks";
import { useLocale } from "@/lib/i18n";

const RECENT_LABELS_KEY_PREFIX = "kehai.recentSessionLabels.";
const MAX_RECENT_LABELS = 5;

function readRecentLabels(classroomId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_LABELS_KEY_PREFIX + classroomId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function rememberLabel(classroomId: string, label: string) {
  if (typeof window === "undefined" || !label) return;
  try {
    const next = [label, ...readRecentLabels(classroomId).filter((l) => l !== label)].slice(0, MAX_RECENT_LABELS);
    localStorage.setItem(RECENT_LABELS_KEY_PREFIX + classroomId, JSON.stringify(next));
  } catch {
    // best-effort convenience only — never block on a storage failure
  }
}

/**
 * Owns the full session lifecycle for a classroom: the open session's QR
 * (if any), starting a new one (with an optional name and a few recently
 * used names as one-tap presets), and a history list where any past
 * session can be restarted at will — a classroom can hold as many
 * sessions as the teacher wants, freely named and freely restarted,
 * unlike the old single "today's session" model.
 */
export function ClassSessionManager({
  classroomId,
  openSession,
  onSessionsChanged,
}: {
  classroomId: string;
  openSession: { id: string; label: string | null } | null;
  onSessionsChanged: () => void;
}) {
  const { t, locale } = useLocale();
  const { data: sessions, mutate } = useClassroomSessions(classroomId);
  const [label, setLabel] = useState("");
  const [starting, setStarting] = useState(false);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentLabels, setRecentLabels] = useState<string[]>([]);

  useEffect(() => {
    setRecentLabels(readRecentLabels(classroomId));
  }, [classroomId]);

  async function refresh() {
    await mutate();
    onSessionsChanged();
  }

  async function startSession() {
    setError(null);
    setStarting(true);
    try {
      const trimmed = label.trim();
      await apiFetch(`/api/classrooms/${classroomId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ label: trimmed || undefined }),
      });
      rememberLabel(classroomId, trimmed);
      setRecentLabels(readRecentLabels(classroomId));
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.sessionStartError"));
    } finally {
      setStarting(false);
    }
  }

  async function closeSession(sessionId: string) {
    setError(null);
    setBusySessionId(sessionId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${sessionId}/close`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.sessionEndError"));
    } finally {
      setBusySessionId(null);
    }
  }

  async function restartSession(sessionId: string) {
    setError(null);
    setBusySessionId(sessionId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${sessionId}/reopen`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.sessionRestartError"));
    } finally {
      setBusySessionId(null);
    }
  }

  return (
    <div className="space-y-6">
      {openSession && (
        <ClassSessionQrPanel
          classroomId={classroomId}
          sessionId={openSession.id}
          onEndSession={() => closeSession(openSession.id)}
          ending={busySessionId === openSession.id}
        />
      )}

      <Card>
        <CardHeader className="text-xs font-semibold uppercase tracking-wider text-white/40">
          {t("classroomDetail.sessionsHeading")}
        </CardHeader>
        <CardBody className="space-y-4">
          {!openSession && (
            <div className="space-y-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("classroomDetail.sessionLabelPlaceholder")}
                underline={false}
              />
              {recentLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {recentLabels.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/50 transition-colors hover:border-kehai-500/40 hover:text-kehai-300"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
              <Button size="sm" loading={starting} onClick={startSession} className="w-full sm:w-auto">
                {t("classroomDetail.startSession")}
              </Button>
            </div>
          )}
          {error && <p className="text-sm text-shu-400">{error}</p>}

          {sessions && sessions.length > 0 ? (
            <div className="scroll-thin max-h-64 space-y-2 overflow-auto border-t border-white/10 pt-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{s.label || t("classroomDetail.untitledSession")}</p>
                    <p className="text-xs text-white/40">
                      {new Date(s.date).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US")} ·{" "}
                      {t("classroomDetail.presentCount", { count: s.presentCount })}
                    </p>
                  </div>
                  {s.status === "OPEN" ? (
                    <Badge status="ACTIVE">{t("classroomDetail.sessionOpenBadge")}</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" loading={busySessionId === s.id} onClick={() => restartSession(s.id)}>
                      {t("classroomDetail.restartSession")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : sessions ? (
            <p className="border-t border-white/10 pt-3 text-sm text-white/35">{t("classroomDetail.noSessionsYet")}</p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
