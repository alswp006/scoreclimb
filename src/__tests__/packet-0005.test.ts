import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { StreakState, BadgeState } from "@/lib/types";

/**
 * PACKET 0005 — Streak & Badge Domain Pure Functions
 *
 * These tests describe pure computation functions for streak continuation
 * and badge unlock logic. Tests are written BEFORE implementation (TDD red phase).
 *
 * Functions under test:
 * - computeStreak(prev, todayCompletedCount, today): StreakState
 * - evaluateBadges(prev, ctx, nowIso): {newlyUnlocked: Badge[], next: BadgeState}
 *
 * Pure functions: no side effects, deterministic, no SDK/network calls.
 * Tests use concrete values (dates, numbers, strings).
 */

describe("Streak & Badge Domain Pure Functions (Packet 0005)", () => {
  // ============================================================================
  // AC-1: computeStreak continuation — previous day, ≥3 completions → current+1
  // ============================================================================

  describe("AC-1: Streak continuation (previous day + 3+ completions)", () => {
    it("should increment current from 4 to 5 when completing 3+ missions the next day", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 4,
        longest: 6,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 20,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(5);
      expect(result.longest).toBe(6);
      expect(result.lastCompletedDate).toBe(today);
      expect(result.totalCompletedMissions).toBe(21);
    });

    it("should update lastCompletedDate to today", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 2,
        longest: 3,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 10,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.lastCompletedDate).toBe(today);
    });

    it("should increment totalCompletedMissions by 1 (per check event, not per mission)", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 1,
        longest: 2,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 5,
      };

      const result = computeStreak(prev, 5, today);

      // totalCompletedMissions increments by 1 per check event
      expect(result.totalCompletedMissions).toBe(6);
    });

    it("should not modify longest if current < longest after increment", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 4,
        longest: 10,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 30,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.longest).toBe(10);
    });
  });

  // ============================================================================
  // AC-2: Streak reset — 2+ days gap → current=1, longest unchanged
  // ============================================================================

  describe("AC-2: Streak reset (2+ days without completion)", () => {
    it("should reset current to 1 when 2+ days passed since last completion", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const twoDaysAgo = "2026-08-22";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 9,
        longest: 9,
        lastCompletedDate: twoDaysAgo,
        totalCompletedMissions: 45,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(1);
    });

    it("should preserve longest streak when resetting current", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const twoDaysAgo = "2026-08-22";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 9,
        longest: 9,
        lastCompletedDate: twoDaysAgo,
        totalCompletedMissions: 45,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.longest).toBe(9);
    });

    it("should update lastCompletedDate to today even when resetting", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const threeDaysAgo = "2026-08-21";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 5,
        longest: 7,
        lastCompletedDate: threeDaysAgo,
        totalCompletedMissions: 25,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.lastCompletedDate).toBe(today);
    });

    it("should increment totalCompletedMissions even on reset", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const twoDaysAgo = "2026-08-22";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 4,
        longest: 6,
        lastCompletedDate: twoDaysAgo,
        totalCompletedMissions: 20,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.totalCompletedMissions).toBe(21);
    });
  });

  // ============================================================================
  // AC-3: Future date handling — no crash, reset to 1, no console.error
  // ============================================================================

  describe("AC-3: Future date handling (graceful degradation)", () => {
    it("should reset current to 1 when lastCompletedDate is in the future", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const futureDate = "2026-08-30";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 7,
        longest: 10,
        lastCompletedDate: futureDate,
        totalCompletedMissions: 40,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(1);
    });

    it("should set lastCompletedDate to today when prev was in future", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const futureDate = "2026-09-15";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 5,
        longest: 8,
        lastCompletedDate: futureDate,
        totalCompletedMissions: 30,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.lastCompletedDate).toBe(today);
    });

    it("should not call console.error on future date", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const consoleErrorSpy = vi.spyOn(console, "error");

      const futureDate = "2026-09-01";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 3,
        longest: 5,
        lastCompletedDate: futureDate,
        totalCompletedMissions: 15,
      };

      computeStreak(prev, 3, today);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should not throw exception on future date", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const futureDate = "2026-12-25";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 6,
        longest: 9,
        lastCompletedDate: futureDate,
        totalCompletedMissions: 35,
      };

      const fn = () => computeStreak(prev, 3, today);
      expect(fn).not.toThrow();
    });
  });

  // ============================================================================
  // AC-4: evaluateBadges unlock — 3-day streak unlocks '사흘의 힘' badge
  // ============================================================================

  describe("AC-4: Badge unlock for 3-day streak", () => {
    it("should unlock exactly 1 new badge when streak reaches 3", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { newlyUnlocked, next } = evaluateBadges(prev, ctx, nowIso);

      expect(newlyUnlocked.length).toBe(1);
    });

    it("should unlock badge with name '사흘의 힘'", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { newlyUnlocked } = evaluateBadges(prev, ctx, nowIso);

      expect(newlyUnlocked[0].name).toBe("사흘의 힘");
    });

    it("should add badge ID to next.unlockedBadgeIds", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { next } = evaluateBadges(prev, ctx, nowIso);

      expect(next.unlockedBadgeIds).toContain("b_streak3");
    });

    it("should record unlockedAt timestamp in ISO format for new badge", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { next } = evaluateBadges(prev, ctx, nowIso);

      expect(next.unlockedAt["b_streak3"]).toBe(nowIso);
      // Verify it's a valid ISO string
      expect(new Date(next.unlockedAt["b_streak3"]).toString()).not.toBe(
        "Invalid Date"
      );
    });

    it("should preserve previously unlocked badges in result", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { next } = evaluateBadges(prev, ctx, nowIso);

      expect(next.unlockedBadgeIds).toContain("b_first");
      expect(next.unlockedAt.b_first).toBe("2026-08-20T10:00:00Z");
    });
  });

  // ============================================================================
  // AC-5: Badge evaluation idempotent — same args → no new unlocks
  // ============================================================================

  describe("AC-5: Idempotent badge evaluation", () => {
    it("should return empty newlyUnlocked when badge already unlocked", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first", "b_streak3"],
        unlockedAt: {
          b_first: "2026-08-20T10:00:00Z",
          b_streak3: "2026-08-24T12:00:00Z",
        },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { newlyUnlocked } = evaluateBadges(prev, ctx, nowIso);

      expect(newlyUnlocked.length).toBe(0);
    });

    it("should return identical next state when called twice with same args", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 3 };
      const nowIso = "2026-08-24T12:00:00Z";

      const result1 = evaluateBadges(prev, ctx, nowIso);
      const result2 = evaluateBadges(result1.next, ctx, nowIso);

      expect(result2.newlyUnlocked.length).toBe(0);
      expect(result2.next.unlockedBadgeIds).toEqual(result1.next.unlockedBadgeIds);
    });

    it("should not modify unlockedAt timestamp for already-unlocked badge", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const originalTimestamp = "2026-08-23T10:00:00Z";
      const prev: BadgeState = {
        unlockedBadgeIds: ["b_streak3"],
        unlockedAt: { b_streak3: originalTimestamp },
      };

      const ctx = { streak: 3 };
      const newNowIso = "2026-08-24T15:30:00Z";

      const { next } = evaluateBadges(prev, ctx, newNowIso);

      expect(next.unlockedAt.b_streak3).toBe(originalTimestamp);
    });
  });

  // ============================================================================
  // Integration: computeStreak + evaluateBadges together
  // ============================================================================

  describe("Integration: Streak continuation triggers badge unlock", () => {
    it("should compute new streak state after 3-day completion", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 2,
        longest: 3,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 8,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(3);
      expect(result.longest).toBe(3);
      expect(result.lastCompletedDate).toBe(today);
      expect(result.totalCompletedMissions).toBe(9);
    });

    it("should pass new streak value to badge evaluation", async () => {
      const { computeStreak } = await import("@/lib/streak");
      const { evaluateBadges } = await import("@/lib/badges");

      // First: compute streak reaching 3
      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const streakPrev: StreakState = {
        current: 2,
        longest: 3,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 8,
      };

      const newStreak = computeStreak(streakPrev, 3, today);

      // Then: evaluate badges with new streak
      const badgePrev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const badgeCtx = { streak: newStreak.current };
      const nowIso = today + "T12:00:00Z";

      const { newlyUnlocked } = evaluateBadges(badgePrev, badgeCtx, nowIso);

      // Should unlock streak3 badge
      expect(newlyUnlocked.length).toBe(1);
      expect(newlyUnlocked[0].name).toBe("사흘의 힘");
    });
  });

  // ============================================================================
  // Edge cases: boundary conditions
  // ============================================================================

  describe("Edge cases: Boundary conditions", () => {
    it("should treat same-day re-check as no streak increase", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const today = "2026-08-24";

      const prev: StreakState = {
        current: 3,
        longest: 4,
        lastCompletedDate: today,
        totalCompletedMissions: 15,
      };

      // Same day, checking again
      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(3);
      expect(result.totalCompletedMissions).toBe(16);
    });

    it("should handle exactly 1 day gap (exactly yesterday)", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 5,
        longest: 7,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 25,
      };

      const result = computeStreak(prev, 3, today);

      // 1 day gap = continuation, not reset
      expect(result.current).toBe(6);
      expect(result.longest).toBe(7);
    });

    it("should update longest if current exceeds previous longest", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 9,
        longest: 9,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 45,
      };

      const result = computeStreak(prev, 3, today);

      expect(result.current).toBe(10);
      expect(result.longest).toBe(10);
    });

    it("should handle zero completed missions (< 3) as no completion", async () => {
      const { computeStreak } = await import("@/lib/streak");

      const yesterday = "2026-08-23";
      const today = "2026-08-24";

      const prev: StreakState = {
        current: 3,
        longest: 4,
        lastCompletedDate: yesterday,
        totalCompletedMissions: 15,
      };

      // Only 2 completions, below threshold
      const result = computeStreak(prev, 2, today);

      // Should reset because < 3 completions
      expect(result.current).toBe(1);
    });

    it("should not unlock streak badge if streak < 3", async () => {
      const { evaluateBadges } = await import("@/lib/badges");

      const prev: BadgeState = {
        unlockedBadgeIds: ["b_first"],
        unlockedAt: { b_first: "2026-08-20T10:00:00Z" },
      };

      const ctx = { streak: 2 };
      const nowIso = "2026-08-24T12:00:00Z";

      const { newlyUnlocked } = evaluateBadges(prev, ctx, nowIso);

      // Should not unlock streak3 badge
      const streakBadge = newlyUnlocked.find((b) => b.name === "사흘의 힘");
      expect(streakBadge).toBeUndefined();
    });
  });
});
