import type { StreakState } from "@/lib/types";
import { diffDays, parseDateKey } from "@/lib/date";

/** Minimum completed missions in a day to count as attendance. */
export const STREAK_ATTENDANCE_THRESHOLD = 3;

/**
 * Pure streak transition. Attendance (todayCompletedCount >= threshold) is required
 * to advance/maintain the streak — falling short resets current without touching
 * lastCompletedDate/totalCompletedMissions (that day was never actually completed).
 */
export function computeStreak(
  prev: StreakState,
  todayCompletedCount: number,
  today: string
): StreakState {
  if (todayCompletedCount < STREAK_ATTENDANCE_THRESHOLD) {
    const current = 1;
    return {
      ...prev,
      current,
      longest: Math.max(prev.longest, current),
    };
  }

  const gap =
    prev.lastCompletedDate === null
      ? Infinity
      : diffDays(parseDateKey(prev.lastCompletedDate), parseDateKey(today));

  const current = gap === 0 ? prev.current : gap === 1 ? prev.current + 1 : 1;

  return {
    current,
    longest: Math.max(prev.longest, current),
    lastCompletedDate: today,
    totalCompletedMissions: prev.totalCompletedMissions + 1,
  };
}
