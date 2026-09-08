"use client";

import { useEffect, useRef, useState } from "react";
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentLabels(readRecentLabels(classroomId));
  }, [classroomId]);

  // A row's Rename/Restart/Delete crammed into three always-visible text
  // buttons was the actual mess — closing on any outside click keeps them
  // tucked behind one "⋯" until someone actually needs them.
  useEffect(() => {
    if (!openMenuId) return;
    function onDocMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmingDeleteId(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openMenuId]);

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
    setOpenMenuId(null);
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

  function startRename(sessionId: string, currentLabel: string | null) {
    setError(null);
    setConfirmingDeleteId(null);
    setOpenMenuId(null);
    setRenamingId(sessionId);
    setRenameValue(currentLabel ?? "");
  }

  async function saveRename(sessionId: string) {
    setError(null);
    setBusySessionId(sessionId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ label: renameValue.trim() }),
      });
      setRenamingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.sessionRenameError"));
    } finally {
      setBusySessionId(null);
    }
  }

  async function deleteSession(sessionId: string) {
    if (confirmingDeleteId !== sessionId) {
      setError(null);
      setRenamingId(null);
      setConfirmingDeleteId(sessionId);
      return;
    }
    setError(null);
    setBusySessionId(sessionId);
    try {
      await apiFetch(`/api/classrooms/${classroomId}/sessions/${sessionId}`, { method: "DELETE" });
      setConfirmingDeleteId(null);
      setOpenMenuId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("classroomDetail.sessionDeleteError"));
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
            <div
              className={`scroll-thin max-h-64 space-y-2 border-t border-white/10 pt-3 ${
                openMenuId ? "overflow-visible" : "overflow-auto"
              }`}
            >
              {sessions.map((s) =>
                renamingId === s.id ? (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder={t("classroomDetail.sessionRenamePlaceholder")}
                        underline={false}
                        autoFocus
                      />
                    </div>
                    <Button size="sm" loading={busySessionId === s.id} onClick={() => saveRename(s.id)}>
                      {t("classroomDetail.saveRename")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setRenamingId(null)}>
                      {t("classroomDetail.cancelRename")}
                    </Button>
                  </div>
                ) : (
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
                    <div className="flex shrink-0 items-center gap-2">
                      {s.status === "OPEN" && <Badge status="ACTIVE">{t("classroomDetail.sessionOpenBadge")}</Badge>}
                      <div className="relative" ref={openMenuId === s.id ? menuRef : undefined}>
                        <button
                          type="button"
                          aria-label={t("classroomDetail.sessionActions")}
                          onClick={() => {
                            setOpenMenuId((cur) => (cur === s.id ? null : s.id));
                            setConfirmingDeleteId(null);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
                        >
                          ⋯
                        </button>

                        {openMenuId === s.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-void-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6)]">
                            {confirmingDeleteId === s.id ? (
                              <div className="space-y-2 p-3">
                                <p className="text-xs text-white/60">{t("classroomDetail.confirmDeleteSession")}</p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    loading={busySessionId === s.id}
                                    onClick={() => deleteSession(s.id)}
                                    className="flex-1"
                                  >
                                    {t("classroomDetail.deleteSession")}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDeleteId(null)}>
                                    {t("classroomDetail.cancelRename")}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-1 text-sm">
                                <button
                                  type="button"
                                  onClick={() => startRename(s.id, s.label)}
                                  className="block w-full px-3 py-2 text-left text-white/75 hover:bg-white/[0.06] hover:text-white"
                                >
                                  {t("classroomDetail.renameSession")}
                                </button>
                                {s.status !== "OPEN" && (
                                  <button
                                    type="button"
                                    onClick={() => restartSession(s.id)}
                                    className="block w-full px-3 py-2 text-left text-white/75 hover:bg-white/[0.06] hover:text-white"
                                  >
                                    {t("classroomDetail.restartSession")}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeleteId(s.id)}
                                  className="block w-full px-3 py-2 text-left text-shu-400 hover:bg-shu-500/10"
                                >
                                  {t("classroomDetail.deleteSession")}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : sessions ? (
            <p className="border-t border-white/10 pt-3 text-sm text-white/35">{t("classroomDetail.noSessionsYet")}</p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
