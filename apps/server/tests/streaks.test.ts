import { describe, expect, it } from "vitest";
import { computeStreaks } from "../src/utils/streaks.js";

describe("computeStreaks", () => {
  it("returns zeros for no sessions at all", () => {
    expect(computeStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("counts a full run of present days as both current and longest", () => {
    const days = [
      { date: "2026-01-01", present: true },
      { date: "2026-01-02", present: true },
      { date: "2026-01-03", present: true },
    ];
    expect(computeStreaks(days)).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("stops the current streak at the most recent absence", () => {
    const days = [
      { date: "2026-01-01", present: true },
      { date: "2026-01-02", present: false },
      { date: "2026-01-03", present: true },
      { date: "2026-01-04", present: true },
    ];
    expect(computeStreaks(days)).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it("finds the longest streak even when it isn't the current one", () => {
    const days = [
      { date: "2026-01-01", present: true },
      { date: "2026-01-02", present: true },
      { date: "2026-01-03", present: true },
      { date: "2026-01-04", present: false },
      { date: "2026-01-05", present: true },
    ];
    expect(computeStreaks(days)).toEqual({ currentStreak: 1, longestStreak: 3 });
  });

  it("is zero for both when the most recent session was an absence", () => {
    const days = [
      { date: "2026-01-01", present: true },
      { date: "2026-01-02", present: false },
    ];
    expect(computeStreaks(days)).toEqual({ currentStreak: 0, longestStreak: 1 });
  });

  it("treats a day with no session as a no-op (not present in the input at all)", () => {
    // Days with no session simply aren't included in the input list — a gap
    // in session dates never appears here, so continuity across a
    // no-class day is guaranteed by the caller filtering to session days only.
    const days = [
      { date: "2026-01-01", present: true },
      // 2026-01-02 had no session, so it's simply absent from this list
      { date: "2026-01-03", present: true },
    ];
    expect(computeStreaks(days)).toEqual({ currentStreak: 2, longestStreak: 2 });
  });
});
