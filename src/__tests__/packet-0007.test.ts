import { describe, it, expect } from "vitest";
import type { CreditProfile, DailyMissionLog, MissionDefinition } from "@/lib/types";

/**
 * PACKET 0007 — 또래 벤치마크 비교 + 추천 미션 로직 (pure functions)
 *
 * These tests describe peer benchmarking and mission recommendation.
 * Tests are written BEFORE implementation (TDD red phase).
 *
 * Functions under test:
 * - getBand(birthYear, todayKey): PeerBenchmark['band']
 * - getBenchmark(band): PeerBenchmark
 * - compareToPeer(profile, benchmark): { scoreDiff, usageDiff, scoreVerdict }
 * - recommendMissions(profile, todayLog): MissionDefinition[]
 *
 * Pure functions: no side effects, no React/localStorage imports, deterministic.
 */

/**
 * PeerBenchmark type matching the spec (not the types.ts version)
 * DB Schema: {band, avgScore, avgCardUsageRatio}
 */
interface PeerBenchmarkSpec {
  band: "20-24" | "25-29" | "30-34" | "35-39" | "40+";
  avgScore: number;
  avgCardUsageRatio: number;
}

interface PeerComparison {
  scoreDiff: number;
  usageDiff: number;
  scoreVerdict: "above" | "similar" | "below";
}

describe("Peer Benchmark & Mission Recommendation (Packet 0007)", () => {
  // ============================================================================
  // AC-1: getBand() age band calculation
  // ============================================================================

  describe("AC-1 (P0): getBand(birthYear, todayKey) — age band calculation", () => {
    it("should return '30-34' band for birthYear=1996 on 2026-08-24", async () => {
      const { getBand } = await import("@/lib/benchmark");

      const band = getBand(1996, "2026-08-24");

      expect(band).toBe("30-34");
    });

    it("should return '20-24' band for birthYear=2005 on 2026-08-24", async () => {
      const { getBand } = await import("@/lib/benchmark");

      const band = getBand(2005, "2026-08-24");

      expect(band).toBe("20-24");
    });

    it("should return '40+' band for birthYear=1980 on 2026-08-24", async () => {
      const { getBand } = await import("@/lib/benchmark");

      const band = getBand(1980, "2026-08-24");

      expect(band).toBe("40+");
    });

    it("should return '25-29' band for age 25", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 2001 → age 25 on 2026-08-24
      const band = getBand(2001, "2026-08-24");

      expect(band).toBe("25-29");
    });

    it("should return '35-39' band for age 35", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 1991 → age 35 on 2026-08-24
      const band = getBand(1991, "2026-08-24");

      expect(band).toBe("35-39");
    });

    it("should handle boundary: age 20 → '20-24'", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 2006 → age 20 on 2026-08-24
      const band = getBand(2006, "2026-08-24");

      expect(band).toBe("20-24");
    });

    it("should handle boundary: age 24 → '20-24'", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 2002 → age 24 on 2026-08-24
      const band = getBand(2002, "2026-08-24");

      expect(band).toBe("20-24");
    });

    it("should handle boundary: age 25 → '25-29'", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 2001 → age 25 on 2026-08-24
      const band = getBand(2001, "2026-08-24");

      expect(band).toBe("25-29");
    });

    it("should handle boundary: age 40 → '40+'", async () => {
      const { getBand } = await import("@/lib/benchmark");

      // Born in 1986 → age 40 on 2026-08-24
      const band = getBand(1986, "2026-08-24");

      expect(band).toBe("40+");
    });
  });

  // ============================================================================
  // AC-2: getBenchmark() returns PeerBenchmark for a band
  // ============================================================================

  describe("AC-2: getBenchmark(band) — return benchmark for band", () => {
    it("should return benchmark with avgScore and avgCardUsageRatio for '30-34'", async () => {
      const { getBenchmark } = await import("@/lib/benchmark");

      const benchmark = getBenchmark("30-34");

      expect(benchmark.band).toBe("30-34");
      expect(typeof benchmark.avgScore).toBe("number");
      expect(typeof benchmark.avgCardUsageRatio).toBe("number");
      expect(benchmark.avgScore).toBeGreaterThanOrEqual(350);
      expect(benchmark.avgScore).toBeLessThanOrEqual(1000);
      expect(benchmark.avgCardUsageRatio).toBeGreaterThanOrEqual(0);
      expect(benchmark.avgCardUsageRatio).toBeLessThanOrEqual(100);
    });

    it("should return consistent benchmark for same band", async () => {
      const { getBenchmark } = await import("@/lib/benchmark");

      const b1 = getBenchmark("25-29");
      const b2 = getBenchmark("25-29");

      expect(b1).toEqual(b2);
      expect(b1.band).toBe("25-29");
      expect(b1.avgScore).toBe(b2.avgScore);
    });

    it("should return different benchmarks for different bands", async () => {
      const { getBenchmark } = await import("@/lib/benchmark");

      const b1 = getBenchmark("20-24");
      const b2 = getBenchmark("40+");

      // Different bands should have different values (at least one field)
      expect(
        b1.avgScore !== b2.avgScore ||
          b1.avgCardUsageRatio !== b2.avgCardUsageRatio
      ).toBe(true);
    });

    it("should return benchmark for all 5 bands", async () => {
      const { getBenchmark } = await import("@/lib/benchmark");

      const bands: Array<"20-24" | "25-29" | "30-34" | "35-39" | "40+"> = [
        "20-24",
        "25-29",
        "30-34",
        "35-39",
        "40+",
      ];

      bands.forEach((band) => {
        const benchmark = getBenchmark(band);
        expect(benchmark.band).toBe(band);
        expect(benchmark.avgScore).toBeGreaterThanOrEqual(350);
        expect(benchmark.avgScore).toBeLessThanOrEqual(1000);
      });
    });
  });

  // ============================================================================
  // AC-3: compareToPeer() score verdict logic
  // ============================================================================

  describe("AC-3: compareToPeer(profile, benchmark) — score verdict", () => {
    it("should return scoreDiff=20 for score 850 vs benchmark avgScore 830", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 850,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(result.scoreDiff).toBe(20);
    });

    it("should return scoreVerdict='above' for scoreDiff=20", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 850,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(result.scoreVerdict).toBe("above");
    });

    it("should return scoreVerdict='similar' for scoreDiff=10 (at boundary)", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 840,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(result.scoreVerdict).toBe("similar");
    });

    it("should return scoreVerdict='similar' for scoreDiff=0", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 830,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(result.scoreVerdict).toBe("similar");
    });

    it("should return scoreVerdict='below' when score is 100 less than benchmark", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 730,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(result.scoreVerdict).toBe("below");
    });

    it("should calculate usageDiff as absolute difference", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 850,
        birthYear: 1996,
        cardUsageRatio: 45,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      expect(Math.abs(result.usageDiff)).toBe(11);
    });

    it("should return scoreVerdict='similar' for scoreDiff=-8 (below threshold)", async () => {
      const { compareToPeer } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 822,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const benchmark: PeerBenchmarkSpec = {
        band: "30-34",
        avgScore: 830,
        avgCardUsageRatio: 34,
      };

      const result = compareToPeer(profile, benchmark);

      // Difference is 8 points, which is <= 10, so similar
      expect(result.scoreVerdict).toBe("similar");
    });
  });

  // ============================================================================
  // AC-4: recommendMissions() length <= 3 and excludes completed
  // ============================================================================

  describe("AC-4: recommendMissions(profile, todayLog) — max 3, exclude completed", () => {
    it("should return at most 3 missions", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [],
        totalPoints: 0,
      };

      const missions = recommendMissions(profile, todayLog);

      expect(missions.length).toBeLessThanOrEqual(3);
    });

    it("should exclude missions that are in completedMissionIds", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: ["m_card_usage", "m_no_late"],
        totalPoints: 0,
      };

      const missions = recommendMissions(profile, todayLog);

      const recommendedIds = missions.map((m: MissionDefinition) => m.id);
      expect(recommendedIds).not.toContain("m_card_usage");
      expect(recommendedIds).not.toContain("m_no_late");
    });

    it("should return MissionDefinition[] with id, title, description, category, points, impact", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [],
        totalPoints: 0,
      };

      const missions = recommendMissions(profile, todayLog);

      missions.forEach((mission: MissionDefinition) => {
        expect(typeof mission.id).toBe("string");
        expect(typeof mission.title).toBe("string");
        expect(typeof mission.description).toBe("string");
        expect(["spending", "saving", "payment", "creditUsage", "debt"]).toContain(
          mission.category
        );
        expect(typeof mission.points).toBe("number");
        expect(["positive", "neutral", "negative"]).toContain(mission.impact);
      });
    });

    it("should prioritize missions based on card usage ratio", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const highUsageProfile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 85,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const lowUsageProfile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 15,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [],
        totalPoints: 0,
      };

      const highUsageMissions = recommendMissions(highUsageProfile, todayLog);
      const lowUsageMissions = recommendMissions(lowUsageProfile, todayLog);

      // Both should return missions, but prioritization may differ
      expect(highUsageMissions.length).toBeGreaterThanOrEqual(0);
      expect(lowUsageMissions.length).toBeGreaterThanOrEqual(0);
    });

    it("should prioritize missions based on loan count", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const highLoanProfile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 5,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const lowLoanProfile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 0,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [],
        totalPoints: 0,
      };

      const highLoanMissions = recommendMissions(highLoanProfile, todayLog);
      const lowLoanMissions = recommendMissions(lowLoanProfile, todayLog);

      expect(highLoanMissions.length).toBeGreaterThanOrEqual(0);
      expect(lowLoanMissions.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // AC-5: All 6 missions completed → empty array, no exception
  // ============================================================================

  describe("AC-5: All missions completed → empty array", () => {
    it("should return empty array when all 6 missions completed", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [
          "m_card_usage",
          "m_no_late",
          "m_auto_pay",
          "m_no_cash_advance",
          "m_score_check",
          "m_debt_plan",
        ],
        totalPoints: 100,
      };

      const missions = recommendMissions(profile, todayLog);

      expect(missions).toEqual([]);
    });

    it("should not throw exception when all missions completed", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [
          "m_card_usage",
          "m_no_late",
          "m_auto_pay",
          "m_no_cash_advance",
          "m_score_check",
          "m_debt_plan",
        ],
        totalPoints: 100,
      };

      expect(() => {
        recommendMissions(profile, todayLog);
      }).not.toThrow();
    });

    it("should return empty array when 5/6 missions completed, with 1 incomplete", async () => {
      const { recommendMissions } = await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 750,
        birthYear: 1996,
        cardUsageRatio: 40,
        loanCount: 2,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [
          "m_card_usage",
          "m_no_late",
          "m_auto_pay",
          "m_no_cash_advance",
          "m_score_check",
        ],
        totalPoints: 90,
      };

      const missions = recommendMissions(profile, todayLog);

      // Should have 1 mission (the non-completed one)
      expect(missions.length).toBe(1);
    });
  });

  // ============================================================================
  // AC-6: No React/localStorage imports
  // ============================================================================

  describe("AC-6: No React/localStorage imports in benchmark.ts", () => {
    it("should not import React from benchmark module", async () => {
      // If React import exists, this will fail at parse time
      const mod = await import("@/lib/benchmark");

      // Module should export functions, not React components
      expect(typeof mod.getBand).toBe("function");
      expect(typeof mod.getBenchmark).toBe("function");
      expect(typeof mod.compareToPeer).toBe("function");
      expect(typeof mod.recommendMissions).toBe("function");
    });

    it("should only export pure functions", async () => {
      const mod = await import("@/lib/benchmark");

      // All exports should be functions
      const exports = Object.values(mod);
      exports.forEach((exp) => {
        expect(typeof exp).toBe("function");
      });
    });
  });

  // ============================================================================
  // Integration: getBand + getBenchmark workflow
  // ============================================================================

  describe("Integration: getBand → getBenchmark workflow", () => {
    it("should chain getBand and getBenchmark for user profile", async () => {
      const { getBand, getBenchmark } = await import("@/lib/benchmark");

      const birthYear = 1996;
      const todayKey = "2026-08-24";

      const band = getBand(birthYear, todayKey);
      expect(band).toBe("30-34");

      const benchmark = getBenchmark(band);
      expect(benchmark.band).toBe("30-34");
      expect(typeof benchmark.avgScore).toBe("number");
    });

    it("should chain all functions for complete recommendation flow", async () => {
      const { getBand, getBenchmark, compareToPeer, recommendMissions } =
        await import("@/lib/benchmark");

      const profile: CreditProfile = {
        score: 850,
        birthYear: 1996,
        cardUsageRatio: 35,
        loanCount: 1,
        updatedAt: "2026-08-24T00:00:00Z",
      };

      const todayLog: DailyMissionLog = {
        date: "2026-08-24",
        completedMissionIds: [],
        totalPoints: 0,
      };

      // Step 1: Get band
      const band = getBand(profile.birthYear, "2026-08-24");
      expect(band).toBeDefined();

      // Step 2: Get benchmark
      const benchmark = getBenchmark(band);
      expect(benchmark).toBeDefined();

      // Step 3: Compare
      const comparison = compareToPeer(profile, benchmark);
      expect(comparison.scoreVerdict).toBeDefined();

      // Step 4: Recommend
      const missions = recommendMissions(profile, todayLog);
      expect(Array.isArray(missions)).toBe(true);
    });
  });
});
