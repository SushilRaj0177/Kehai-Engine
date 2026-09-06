/**
 * Attendance-streak computation, shared by classroom.service.ts (student
 * dashboards) and its heatmap aggregation.
 *
 * Input is a chronologically-sorted list of entries, one per calendar day a
 * session actually happened for that classroom (a day with no session held
 * simply has no entry — it does not break continuity, since there was
 * nothing to attend). `present` is whether the student has a ClassAttendance
 * record for that day's session.
 */
export interface StreakDay {
  date: string; // "YYYY-MM-DD" or any sortable key — only order/equality matters here
  present: boolean;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * currentStreak: consecutive `present: true` entries counting back from the
 * most recent session date, stopping at the first `present: false`.
 * longestStreak: the longest such run anywhere in the (assumed
 * chronologically ascending) history.
 */
export function computeStreaks(daysAscending: StreakDay[]): StreakResult {
  let longestStreak = 0;
  let running = 0;
  for (const day of daysAscending) {
    if (day.present) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  for (let i = daysAscending.length - 1; i >= 0; i--) {
    if (daysAscending[i].present) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}
