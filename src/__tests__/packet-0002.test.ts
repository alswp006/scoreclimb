import { describe, it, expect } from "vitest";

describe("Packet 0002: 고정 상수 테이블 + 스토리지 키", () => {
  // Note: These tests will fail until src/lib/constants.ts is implemented
  // Tests are written BEFORE implementation (TDD)

  describe("AC-1: STORAGE_KEYS must have exactly 7 entries with correct naming", () => {
    it("should have exactly 7 storage keys", () => {
      const { STORAGE_KEYS } = require("@/lib/constants");
      const keys = Object.values<string>(STORAGE_KEYS);
      expect(keys).toHaveLength(7);
    });

    it("all storage keys must start with 'scoreclimb.' and end with '.v1'", () => {
      const { STORAGE_KEYS } = require("@/lib/constants");
      const keys = Object.values<string>(STORAGE_KEYS);

      keys.forEach((key: string) => {
        expect(key).toMatch(/^scoreclimb\..+\.v1$/);
      });
    });

    it("should have all required storage key names", () => {
      const { STORAGE_KEYS } = require("@/lib/constants");
      expect(STORAGE_KEYS).toHaveProperty("profile");
      expect(STORAGE_KEYS).toHaveProperty("scoreHistory");
      expect(STORAGE_KEYS).toHaveProperty("missionLogs");
      expect(STORAGE_KEYS).toHaveProperty("streak");
      expect(STORAGE_KEYS).toHaveProperty("badges");
      expect(STORAGE_KEYS).toHaveProperty("lastSimulation");
      expect(STORAGE_KEYS).toHaveProperty("flags");
    });

    it("should have correct storage key values", () => {
      const { STORAGE_KEYS } = require("@/lib/constants");
      expect(STORAGE_KEYS.profile).toBe("scoreclimb.profile.v1");
      expect(STORAGE_KEYS.scoreHistory).toBe("scoreclimb.scoreHistory.v1");
      expect(STORAGE_KEYS.missionLogs).toBe("scoreclimb.missionLogs.v1");
      expect(STORAGE_KEYS.streak).toBe("scoreclimb.streak.v1");
      expect(STORAGE_KEYS.badges).toBe("scoreclimb.badges.v1");
      expect(STORAGE_KEYS.lastSimulation).toBe("scoreclimb.lastSimulation.v1");
      expect(STORAGE_KEYS.flags).toBe("scoreclimb.flags.v1");
    });
  });

  describe("AC-2: MISSION_DEFINITIONS must have exactly 6 missions with correct IDs and point total", () => {
    it("should have exactly 6 mission definitions", () => {
      const { MISSION_DEFINITIONS } = require("@/lib/constants");
      expect(MISSION_DEFINITIONS).toHaveLength(6);
    });

    it("should have correct mission IDs in order", () => {
      const { MISSION_DEFINITIONS } = require("@/lib/constants");
      const ids = MISSION_DEFINITIONS.map((m: any) => m.id);
      expect(ids).toEqual([
        "m_card_usage",
        "m_no_late",
        "m_auto_pay",
        "m_no_cash_advance",
        "m_score_check",
        "m_debt_plan",
      ]);
    });

    it("should have points that sum to exactly 12", () => {
      const { MISSION_DEFINITIONS } = require("@/lib/constants");
      const totalPoints = MISSION_DEFINITIONS.reduce((sum: number, m: any) => sum + m.points, 0);
      expect(totalPoints).toBe(12);
    });

    it("each mission should have required fields", () => {
      const { MISSION_DEFINITIONS } = require("@/lib/constants");
      MISSION_DEFINITIONS.forEach((mission: any) => {
        expect(mission).toHaveProperty("id");
        expect(mission).toHaveProperty("title");
        expect(mission).toHaveProperty("description");
        expect(mission).toHaveProperty("category");
        expect(mission).toHaveProperty("points");
        expect(mission).toHaveProperty("impact");
      });
    });

    it("all mission points should be positive integers", () => {
      const { MISSION_DEFINITIONS } = require("@/lib/constants");
      MISSION_DEFINITIONS.forEach((mission: any) => {
        expect(typeof mission.points).toBe("number");
        expect(mission.points).toBeGreaterThan(0);
        expect(Number.isInteger(mission.points)).toBe(true);
      });
    });
  });

  describe("AC-3: BADGE_DEFINITIONS must have exactly 6 badges with correct conditions", () => {
    it("should have exactly 6 badge definitions", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      expect(BADGE_DEFINITIONS).toHaveLength(6);
    });

    it("should have badges with condition totalMissions:1", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "totalMissions:1");
      expect(badge).toBeDefined();
      expect(badge).toHaveProperty("id");
      expect(badge).toHaveProperty("name");
      expect(badge).toHaveProperty("description");
      expect(badge).toHaveProperty("icon");
    });

    it("should have badges with condition streak:3", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "streak:3");
      expect(badge).toBeDefined();
    });

    it("should have badges with condition streak:7", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "streak:7");
      expect(badge).toBeDefined();
    });

    it("should have badges with condition streak:30", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "streak:30");
      expect(badge).toBeDefined();
    });

    it("should have badges with condition totalMissions:50", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "totalMissions:50");
      expect(badge).toBeDefined();
    });

    it("should have badges with condition simulation:1", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      const badge = BADGE_DEFINITIONS.find((b: any) => b.condition === "simulation:1");
      expect(badge).toBeDefined();
    });

    it("each badge should have required fields", () => {
      const { BADGE_DEFINITIONS } = require("@/lib/constants");
      BADGE_DEFINITIONS.forEach((badge: any) => {
        expect(badge).toHaveProperty("id");
        expect(badge).toHaveProperty("name");
        expect(badge).toHaveProperty("description");
        expect(badge).toHaveProperty("icon");
        expect(badge).toHaveProperty("condition");
      });
    });
  });

  describe("AC-4: PEER_BENCHMARKS must have 5 bands with correct age range values", () => {
    it("should have exactly 5 peer benchmark bands", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      expect(PEER_BENCHMARKS).toHaveLength(5);
    });

    it("should have benchmark for age 20-24 with score 720 and count 42", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      const band = PEER_BENCHMARKS.find((b: any) => b.ageMin === 20 && b.ageMax === 24);
      expect(band).toBeDefined();
      expect(band?.averageScore).toBe(720);
      expect(band?.sampleSize).toBe(42);
    });

    it("should have benchmark for age 25-29 with score 780 and count 38", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      const band = PEER_BENCHMARKS.find((b: any) => b.ageMin === 25 && b.ageMax === 29);
      expect(band).toBeDefined();
      expect(band?.averageScore).toBe(780);
      expect(band?.sampleSize).toBe(38);
    });

    it("should have benchmark for age 30-34 with score 830 and count 34", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      const band = PEER_BENCHMARKS.find((b: any) => b.ageMin === 30 && b.ageMax === 34);
      expect(band).toBeDefined();
      expect(band?.averageScore).toBe(830);
      expect(band?.sampleSize).toBe(34);
    });

    it("should have benchmark for age 35-39 with score 860 and count 31", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      const band = PEER_BENCHMARKS.find((b: any) => b.ageMin === 35 && b.ageMax === 39);
      expect(band).toBeDefined();
      expect(band?.averageScore).toBe(860);
      expect(band?.sampleSize).toBe(31);
    });

    it("should have benchmark for age 40+ with score 875 and count 29", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      const band = PEER_BENCHMARKS.find((b: any) => b.ageMin === 40 && b.ageMax === null);
      expect(band).toBeDefined();
      expect(band?.averageScore).toBe(875);
      expect(band?.sampleSize).toBe(29);
    });

    it("each benchmark should have required fields", () => {
      const { PEER_BENCHMARKS } = require("@/lib/constants");
      PEER_BENCHMARKS.forEach((band: any) => {
        expect(band).toHaveProperty("ageMin");
        expect(typeof band.ageMin).toBe("number");
        expect(band).toHaveProperty("averageScore");
        expect(typeof band.averageScore).toBe("number");
        expect(band).toHaveProperty("sampleSize");
        expect(typeof band.sampleSize).toBe("number");
      });
    });
  });

  describe("AC-5: Forbidden APIs must not be used", () => {
    it("should not use Array.prototype.at", () => {
      const constantsFile = require("fs").readFileSync("src/lib/constants.ts", "utf-8");
      expect(constantsFile).not.toMatch(/\.at\(/);
    });

    it("should not use Object.groupBy", () => {
      const constantsFile = require("fs").readFileSync("src/lib/constants.ts", "utf-8");
      expect(constantsFile).not.toMatch(/Object\.groupBy/);
    });

    it("should not use structuredClone", () => {
      const constantsFile = require("fs").readFileSync("src/lib/constants.ts", "utf-8");
      expect(constantsFile).not.toMatch(/structuredClone/);
    });

    it("should not use findLast", () => {
      const constantsFile = require("fs").readFileSync("src/lib/constants.ts", "utf-8");
      expect(constantsFile).not.toMatch(/\.findLast\(/);
    });
  });

  describe("Default constants and limits", () => {
    it("should export DEFAULT_FLAGS with onboardingDone=false and disclaimerAckedAt=null", () => {
      const { DEFAULT_FLAGS } = require("@/lib/constants");
      expect(DEFAULT_FLAGS).toEqual({
        onboardingDone: false,
        disclaimerAckedAt: null,
      });
    });

    it("should export DEFAULT_STREAK with all zeros and nulls", () => {
      const { DEFAULT_STREAK } = require("@/lib/constants");
      expect(DEFAULT_STREAK).toEqual({
        current: 0,
        longest: 0,
        lastCompletedDate: null,
        totalCompletedMissions: 0,
      });
    });

    it("should export DEFAULT_BADGES with empty arrays", () => {
      const { DEFAULT_BADGES } = require("@/lib/constants");
      expect(DEFAULT_BADGES).toEqual({
        unlockedBadgeIds: [],
        unlockedAt: {},
      });
    });

    it("should have MAX_MISSION_LOG_DAYS = 180", () => {
      const { MAX_MISSION_LOG_DAYS } = require("@/lib/constants");
      expect(MAX_MISSION_LOG_DAYS).toBe(180);
    });

    it("should have MAX_SCORE_HISTORY = 90", () => {
      const { MAX_SCORE_HISTORY } = require("@/lib/constants");
      expect(MAX_SCORE_HISTORY).toBe(90);
    });

    it("should have PRUNE_MISSION_LOG_DAYS = 90", () => {
      const { PRUNE_MISSION_LOG_DAYS } = require("@/lib/constants");
      expect(PRUNE_MISSION_LOG_DAYS).toBe(90);
    });

    it("should have PRUNE_SCORE_HISTORY_DAYS = 60", () => {
      const { PRUNE_SCORE_HISTORY_DAYS } = require("@/lib/constants");
      expect(PRUNE_SCORE_HISTORY_DAYS).toBe(60);
    });
  });

  describe("Type safety and structure", () => {
    it("should only import types from @/lib/types", () => {
      const constantsFile = require("fs").readFileSync("src/lib/constants.ts", "utf-8");
      // Verify that only type imports are used from @/lib/types
      const typeImports = constantsFile.match(/import type \{ .+ \} from ['"]@\/lib\/types['"]/);
      expect(typeImports).not.toBeNull();
      // Verify no default/runtime imports from @/lib/types
      expect(constantsFile).not.toMatch(/import \{ .+ \} from ['"]@\/lib\/types['"]/);
    });

    it("STORAGE_KEYS should be 'as const' for type inference", () => {
      const { STORAGE_KEYS } = require("@/lib/constants");
      // Values should be literal strings, not just strings
      expect(typeof STORAGE_KEYS.profile).toBe("string");
      // Check that it's structured as an object
      expect(Object.keys(STORAGE_KEYS)).toHaveLength(7);
    });
  });
});
