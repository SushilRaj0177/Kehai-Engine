"use client";

import useSWR from "swr";
import { apiFetch } from "./api";
import type {
  AttendeeRow,
  Anomaly,
  ClassroomDetail,
  ClassroomSummary,
  ClassSessionSummary,
  EnrolledClassroom,
  EventAnalytics,
  EventInsights,
  EventSummary,
  HeatmapResponse,
  MyRegistration,
  Organization,
  PostEventReport,
  RosterRow,
} from "./types";

const fetcher = <T,>(path: string) => apiFetch<T>(path);

export function useMyOrganizations() {
  return useSWR<Organization[]>("/api/orgs", fetcher);
}

export function useOrgEvents(orgId: string | undefined) {
  return useSWR<EventSummary[]>(orgId ? `/api/orgs/${orgId}/events` : null, fetcher);
}

export function usePublicEvents() {
  return useSWR<EventSummary[]>("/api/events", fetcher);
}

export function useMyRegistrations(enabled: boolean) {
  return useSWR<MyRegistration[]>(enabled ? "/api/events/mine" : null, fetcher);
}

export function useEvent(eventId: string | undefined) {
  return useSWR<EventSummary>(eventId ? `/api/events/${eventId}` : null, fetcher);
}

export function useAttendees(eventId: string | undefined, query?: { q?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (query?.q) qs.set("q", query.q);
  if (query?.status) qs.set("status", query.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return useSWR<AttendeeRow[]>(eventId ? `/api/events/${eventId}/attendees${suffix}` : null, fetcher, {
    refreshInterval: 8000,
  });
}

export function useEventAnalytics(eventId: string | undefined) {
  return useSWR<EventAnalytics>(eventId ? `/api/analytics/events/${eventId}` : null, fetcher, {
    refreshInterval: 10000,
  });
}

export function useEventAnomalies(eventId: string | undefined) {
  return useSWR<Anomaly[]>(eventId ? `/api/analytics/events/${eventId}/anomalies` : null, fetcher, {
    refreshInterval: 15000,
  });
}

export function useEventInsights(eventId: string | undefined, enabled: boolean) {
  return useSWR<EventInsights>(eventId && enabled ? `/api/ai/events/${eventId}/insights` : null, fetcher);
}

export function usePostEventReport(eventId: string | undefined, enabled: boolean) {
  return useSWR<PostEventReport>(eventId && enabled ? `/api/ai/events/${eventId}/report` : null, fetcher);
}

export function useAiStatus() {
  return useSWR<{ enabled: boolean }>("/api/ai/status", fetcher);
}

export function useOrgOverview(orgId: string | undefined) {
  return useSWR(orgId ? `/api/analytics/orgs/${orgId}/overview` : null, fetcher);
}

export function useMyClassrooms() {
  return useSWR<ClassroomSummary[]>("/api/classrooms/mine", fetcher);
}

export function useEnrolledClassrooms() {
  return useSWR<EnrolledClassroom[]>("/api/classrooms/enrolled", fetcher);
}

export function useClassroom(id: string | undefined) {
  return useSWR<ClassroomDetail>(id ? `/api/classrooms/${id}` : null, fetcher);
}

export function useClassroomRoster(id: string | undefined) {
  return useSWR<RosterRow[]>(id ? `/api/classrooms/${id}/roster` : null, fetcher, {
    refreshInterval: 8000,
  });
}

export function useClassroomSessions(id: string | undefined) {
  return useSWR<ClassSessionSummary[]>(id ? `/api/classrooms/${id}/sessions` : null, fetcher, {
    refreshInterval: 8000,
  });
}

export function useClassroomHeatmap(id: string | undefined, studentId?: string) {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return useSWR<HeatmapResponse>(id ? `/api/classrooms/${id}/heatmap${qs}` : null, fetcher, {
    refreshInterval: 10000,
  });
}
