import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  CreditProfile,
  ScoreSnapshot,
  MissionLogMap,
  DailyMissionLog,
  StreakState,
  BadgeState,
  SimulationResult,
  AppFlags,
  SaveResult,
} from "@/lib/types";

/**
 * PACKET 0004 — Entity CRUD + Range Validation Type Guards
 *
 * These tests describe the repository module's load/save functions.
 * Tests are written BEFORE implementation (TDD red phase).
 *
 * Entities:
 * - Profile (CreditProfile)
 * - ScoreHistory (ScoreSnapshot[])
 * - MissionLogs (MissionLogMap)
 * - Streak (StreakState)
 * - Badges (BadgeState)
 * - LastSimulation (SimulationResult)
 * - Flags (AppFlags)
 *
 * Storage keys (localStorage):
 * - 'scoreclimb.profile.v1'
 * - 'scoreclimb.scoreHistory.v1'
 * - 'scoreclimb.missionLogs.v1'
 * - 'scoreclimb.streak.v1'
 * - 'scoreclimb.badges.v1'
 * - 'scoreclimb.lastSimulation.v1'
 * - 'scoreclimb.flags.v1'
 */

describe("Entity CRUD + Range Validation Type Guards (Packet 0004)", () => {
  // ============================================================================
  // AC-1: saveProfile with valid data returns {ok:true}, loadProfile gets correct score
  // ============================================================================

  describe("AC-1: saveProfile with valid data", () => {
    it("should save profile and return {ok:true}", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 820,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should load saved profile with correct score", async () => {
      const { saveProfile, loadProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 820,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };

      await saveProfile(profile);
      const loaded = await loadProfile();

      expect(loaded).toBeDefined();
      expect(loaded?.score).toBe(820);
    });

    it("should set updatedAt to a valid ISO 8601 string", async () => {
      const { saveProfile, loadProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 820,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };

      await saveProfile(profile);
      const loaded = await loadProfile();

      expect(loaded).toBeDefined();
      expect(loaded?.updatedAt).toBeDefined();
      // Valid ISO 8601 should parse without "Invalid Date"
      expect(new Date(loaded!.updatedAt).toString()).not.toBe("Invalid Date");
    });
  });

  // ============================================================================
  // AC-2: saveProfile with out-of-range score returns {ok:false}, localStorage unchanged
  // ============================================================================

  describe("AC-2: saveProfile with invalid score (out of range)", () => {
    it("should reject score > 1000 and return error", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 1200, // Invalid: must be 350~1000
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should not modify localStorage when score validation fails", async () => {
      const { saveProfile, loadProfile } = await import("@/lib/repository");

      // Save a valid profile first
      const validProfile: Omit<CreditProfile, "updatedAt"> = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };
      await saveProfile(validProfile);
      const beforeAttempt = await loadProfile();

      // Try to save invalid profile
      const invalidProfile: Omit<CreditProfile, "updatedAt"> = {
        score: 1200,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };
      await saveProfile(invalidProfile);

      // Verify localStorage unchanged
      const afterAttempt = await loadProfile();
      expect(afterAttempt?.score).toBe(beforeAttempt?.score);
    });
  });

  // ============================================================================
  // AC-3: Range validation error messages are exact
  // ============================================================================

  describe("AC-3: Exact error messages for range violations", () => {
    it("should return exact error message for score violation", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 1200, // Out of range: 350~1000
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("점수는 350~1000 사이여야 해요");
    });

    it("should return exact error message for birthYear violation", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 750,
        birthYear: 1950, // Out of range: 1960~2010
        cardUsageRatio: 45,
        loanCount: 1,
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("출생연도는 1960~2010 사이여야 해요");
    });

    it("should return exact error message for cardUsageRatio violation", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 150, // Out of range: 0~100
        loanCount: 1,
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("카드 사용률은 0~100 사이여야 해요");
    });

    it("should return exact error message for loanCount violation", async () => {
      const { saveProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 15, // Out of range: 0~10
      };

      const result = await saveProfile(profile);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("대출 건수는 0~10 사이여야 해요");
    });
  });

  // ============================================================================
  // AC-4: MissionLogs FIFO eviction (max 180 days, oldest deleted)
  // ============================================================================

  describe("AC-4: MissionLogs FIFO eviction when exceeding 180 days", () => {
    it("should maintain max 180 mission log entries", async () => {
      const { saveMissionLog, loadMissionLogs } = await import(
        "@/lib/repository"
      );

      // Seed localStorage with 200 mission log entries (dates from 200 days ago to today)
      const missionLogs: MissionLogMap = {};
      for (let i = 0; i < 200; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (199 - i)); // 200 days ago to today
        const dateStr = date.toISOString().split("T")[0];
        missionLogs[dateStr] = {
          date: dateStr,
          completedMissionIds: [`m1`],
          totalPoints: 10,
        };
      }
      localStorage.setItem(
        "scoreclimb.missionLogs.v1",
        JSON.stringify(missionLogs)
      );

      // Add one more new date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const newLog: DailyMissionLog = {
        date: tomorrowStr,
        completedMissionIds: [`m2`],
        totalPoints: 20,
      };

      await saveMissionLog(newLog);
      const loaded = await loadMissionLogs();

      // Should have exactly 180 entries (FIFO: oldest deleted)
      expect(Object.keys(loaded).length).toBe(180);
    });

    it("should delete oldest date when adding new mission log to full storage", async () => {
      const { saveMissionLog, loadMissionLogs } = await import(
        "@/lib/repository"
      );

      // Seed with 180 mission logs starting from 180 days ago
      const missionLogs: MissionLogMap = {};
      const dates: string[] = [];
      for (let i = 0; i < 180; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (179 - i));
        const dateStr = date.toISOString().split("T")[0];
        dates.push(dateStr);
        missionLogs[dateStr] = {
          date: dateStr,
          completedMissionIds: [`m1`],
          totalPoints: 10,
        };
      }
      localStorage.setItem(
        "scoreclimb.missionLogs.v1",
        JSON.stringify(missionLogs)
      );

      // Add one more new date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const newLog: DailyMissionLog = {
        date: tomorrowStr,
        completedMissionIds: [`m2`],
        totalPoints: 20,
      };

      await saveMissionLog(newLog);
      const loaded = await loadMissionLogs();

      // Oldest date (first) should be gone
      expect(loaded[dates[0] as keyof typeof loaded]).toBeUndefined();
      // New date should be present
      expect(loaded[tomorrowStr as keyof typeof loaded]).toBeDefined();
    });
  });

  // ============================================================================
  // AC-5: Empty state defaults (loadFlags, loadMissionLogs, loadBadges with 0 setItem calls)
  // ============================================================================

  describe("AC-5: Empty state defaults without writing to localStorage", () => {
    it("should return default AppFlags when empty", async () => {
      const { loadFlags } = await import("@/lib/repository");

      const flags = await loadFlags();

      expect(flags.onboardingDone).toBe(false);
      expect(flags.disclaimerAckedAt).toBeNull();
    });

    it("should return empty MissionLogMap when no logs exist", async () => {
      const { loadMissionLogs } = await import("@/lib/repository");

      const logs = await loadMissionLogs();

      expect(logs).toEqual({});
      expect(Object.keys(logs).length).toBe(0);
    });

    it("should return default BadgeState when empty", async () => {
      const { loadBadges } = await import("@/lib/repository");

      const badges = await loadBadges();

      expect(badges.unlockedBadgeIds).toEqual([]);
      expect(badges.unlockedAt).toEqual({});
    });

    it("should not write to localStorage on empty load (flags)", async () => {
      const { loadFlags } = await import("@/lib/repository");

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      await loadFlags();

      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it("should not write to localStorage on empty load (missionLogs)", async () => {
      const { loadMissionLogs } = await import("@/lib/repository");

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      await loadMissionLogs();

      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it("should not write to localStorage on empty load (badges)", async () => {
      const { loadBadges } = await import("@/lib/repository");

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      await loadBadges();

      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();
    });
  });

  // ============================================================================
  // AC-6: upsertSnapshot updates today's entry without changing array length
  // ============================================================================

  describe("AC-6: upsertSnapshot updates existing date without changing length", () => {
    it("should update score for existing date without changing array length", async () => {
      const { upsertSnapshot, loadScoreHistory } = await import(
        "@/lib/repository"
      );

      const today = new Date().toISOString().split("T")[0];

      // Seed with 5 snapshots including today
      const snapshots: ScoreSnapshot[] = [
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 700 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 710 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 720 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 730 },
        { date: today, score: 800 },
      ];
      localStorage.setItem(
        "scoreclimb.scoreHistory.v1",
        JSON.stringify(snapshots)
      );

      const beforeLength = (await loadScoreHistory()).length;

      // Upsert today's snapshot with new score
      await upsertSnapshot({ date: today, score: 835 });

      const after = await loadScoreHistory();

      // Length should remain unchanged
      expect(after.length).toBe(beforeLength);
      // Today's score should be updated
      const todaySnapshot = after.find((s: ScoreSnapshot) => s.date === today);
      expect(todaySnapshot?.score).toBe(835);
    });

    it("should add new snapshot if date does not exist", async () => {
      const { upsertSnapshot, loadScoreHistory } = await import(
        "@/lib/repository"
      );

      const today = new Date().toISOString().split("T")[0];

      // Seed with 3 snapshots (no today)
      const snapshots: ScoreSnapshot[] = [
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 700 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 710 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], score: 720 },
      ];
      localStorage.setItem(
        "scoreclimb.scoreHistory.v1",
        JSON.stringify(snapshots)
      );

      const beforeLength = (await loadScoreHistory()).length;

      // Upsert today's snapshot (new date)
      await upsertSnapshot({ date: today, score: 835 });

      const after = await loadScoreHistory();

      // Length should increase by 1
      expect(after.length).toBe(beforeLength + 1);
      // Today's snapshot should exist
      const todaySnapshot = after.find((s: ScoreSnapshot) => s.date === today);
      expect(todaySnapshot).toBeDefined();
      expect(todaySnapshot?.score).toBe(835);
    });
  });

  // ============================================================================
  // Additional integration tests for all entities
  // ============================================================================

  describe("Integration: All load functions return sensible defaults", () => {
    it("should load all entities from clean localStorage", async () => {
      const {
        loadProfile,
        loadScoreHistory,
        loadMissionLogs,
        loadStreak,
        loadBadges,
        loadLastSimulation,
        loadFlags,
      } = await import("@/lib/repository");

      // All loads should complete without error
      const profile = await loadProfile();
      const history = await loadScoreHistory();
      const missions = await loadMissionLogs();
      const streak = await loadStreak();
      const badges = await loadBadges();
      const simulation = await loadLastSimulation();
      const flags = await loadFlags();

      // Each should have a defined type (even if null/empty)
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);

      expect(missions).toBeDefined();
      expect(typeof missions).toBe("object");

      expect(badges).toBeDefined();
      expect(badges.unlockedBadgeIds).toBeDefined();
      expect(badges.unlockedAt).toBeDefined();

      expect(flags).toBeDefined();
      expect(flags.onboardingDone).toBeDefined();
    });
  });

  describe("Integration: Save and load roundtrip for each entity", () => {
    it("should roundtrip Profile: save → load → exact match", async () => {
      const { saveProfile, loadProfile } = await import("@/lib/repository");

      const profile: Omit<CreditProfile, "updatedAt"> = {
        score: 765,
        birthYear: 1995,
        cardUsageRatio: 42,
        loanCount: 2,
      };

      await saveProfile(profile);
      const loaded = await loadProfile();

      expect(loaded?.score).toBe(profile.score);
      expect(loaded?.birthYear).toBe(profile.birthYear);
      expect(loaded?.cardUsageRatio).toBe(profile.cardUsageRatio);
      expect(loaded?.loanCount).toBe(profile.loanCount);
    });

    it("should roundtrip Streak: save → load → exact match", async () => {
      const { saveStreak, loadStreak } = await import("@/lib/repository");

      const streak: StreakState = {
        current: 5,
        longest: 12,
        lastCompletedDate: "2026-08-20",
        totalCompletedMissions: 47,
      };

      await saveStreak(streak);
      const loaded = await loadStreak();

      expect(loaded?.current).toBe(streak.current);
      expect(loaded?.longest).toBe(streak.longest);
      expect(loaded?.lastCompletedDate).toBe(streak.lastCompletedDate);
      expect(loaded?.totalCompletedMissions).toBe(streak.totalCompletedMissions);
    });

    it("should roundtrip Badges: save → load → exact match", async () => {
      const { saveBadges, loadBadges } = await import("@/lib/repository");

      const badges: BadgeState = {
        unlockedBadgeIds: ["badge-1", "badge-5"],
        unlockedAt: {
          "badge-1": "2026-08-10T10:00:00Z",
          "badge-5": "2026-08-15T14:30:00Z",
        },
      };

      await saveBadges(badges);
      const loaded = await loadBadges();

      expect(loaded?.unlockedBadgeIds).toEqual(badges.unlockedBadgeIds);
      expect(loaded?.unlockedAt).toEqual(badges.unlockedAt);
    });

    it("should roundtrip Flags: save → load → exact match", async () => {
      const { saveFlags, loadFlags } = await import("@/lib/repository");

      const flags: AppFlags = {
        onboardingDone: true,
        disclaimerAckedAt: "2026-08-20T09:15:00Z",
      };

      await saveFlags(flags);
      const loaded = await loadFlags();

      expect(loaded?.onboardingDone).toBe(flags.onboardingDone);
      expect(loaded?.disclaimerAckedAt).toBe(flags.disclaimerAckedAt);
    });
  });
});
