// An event's `status` (DRAFT/PUBLISHED/ACTIVE/…) is set manually by the
// organizer and an event's check-in *window* is computed independently from
// its start/end time plus the open-before/close-after grace minutes. Those
// two "is this event live" signals aren't kept in sync — an organizer can
// leave an event marked ACTIVE long after its window has elapsed — which is
// exactly what reads as a broken system to both organizers and attendees.
// This helper is the single place that computes the window so every screen
// that needs to explain "why can't I check in" agrees on the same answer.

export type CheckInWindowStatus = "not_open" | "open" | "closed";

export interface CheckInWindowInput {
  startsAt: string;
  endsAt: string;
  attendanceOpensMinutesBefore: number;
  attendanceClosesMinutesAfter: number;
}

export interface CheckInWindow {
  status: CheckInWindowStatus;
  opensAt: Date;
  closesAt: Date;
}

export function getCheckInWindow(event: CheckInWindowInput, now: Date = new Date()): CheckInWindow {
  const opensAt = new Date(new Date(event.startsAt).getTime() - event.attendanceOpensMinutesBefore * 60_000);
  const closesAt = new Date(new Date(event.endsAt).getTime() + event.attendanceClosesMinutesAfter * 60_000);
  const status: CheckInWindowStatus = now < opensAt ? "not_open" : now > closesAt ? "closed" : "open";
  return { status, opensAt, closesAt };
}
