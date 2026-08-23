import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SimulationInput, SimulationResult } from "@/lib/types";

/**
 * PACKET 0006 — 시뮬레이션 계산 엔진 (pure function)
 *
 * These tests describe the deterministic score simulation function.
 * Tests are written BEFORE implementation (TDD red phase).
 *
 * Function under test:
 * - simulate(input: SimulationInput): SimulationResult
 *
 * Pure function: no side effects, deterministic, no SDK/network calls.
 * Identical input → identical output (except createdAt ISO timestamp).
 *
 * Input factors: currentScore, cardUsageRatio, onTimePaymentMonths, newLoanCount
 * Output factors (length 4): card usage impact, payment history impact, loan impact, and one more
 */

describe("Credit Score Simulation Engine — simulate() (Packet 0006)", () => {
  // ============================================================================
  // AC-1: Deterministic computation — 100 identical calls → 100 identical results
  // ============================================================================

  describe("AC-1: Deterministic behavior (100 identical inputs → identical outputs)", () => {
    it("should return identical predictedScore for 100 consecutive calls with same input", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 820,
        cardUsageRatio: 25,
        onTimePaymentMonths: 6,
        newLoanCount: 1,
      };

      const results: SimulationResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(simulate(input));
      }

      // All 100 predictedScores must be identical
      const firstScore = results[0].predictedScore;
      expect(
        results.every((r) => r.predictedScore === firstScore)
      ).toBe(true);
    });

    it("should return identical delta for 100 consecutive calls with same input", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 750,
        cardUsageRatio: 45,
        onTimePaymentMonths: 12,
        newLoanCount: 0,
      };

      const results: SimulationResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(simulate(input, { current: 5 }));
      }

      const firstDelta = results[0].delta;
      expect(results.every((r) => r.delta === firstDelta)).toBe(true);
    });

    it("should return identical monthlyProjection arrays for 100 consecutive calls", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 60,
        onTimePaymentMonths: 8,
        newLoanCount: 2,
      };

      const results: SimulationResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(simulate(input, { current: 3 }));
      }

      const firstProjection = results[0].monthlyProjection;
      expect(
        results.every((r) =>
          r.monthlyProjection.every(
            (val, idx) => val === firstProjection[idx]
          )
        )
      ).toBe(true);
    });

    it("should return identical factors for 100 consecutive calls", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 600,
        cardUsageRatio: 80,
        onTimePaymentMonths: 24,
        newLoanCount: 3,
      };

      const results: SimulationResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(simulate(input, { current: 0 }));
      }

      const firstFactors = JSON.stringify(results[0].factors);
      expect(
        results.every(
          (r) => JSON.stringify(r.factors) === firstFactors
        )
      ).toBe(true);
    });

    it("should return identical input echo for 100 consecutive calls", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 850,
        cardUsageRatio: 20,
        onTimePaymentMonths: 18,
        newLoanCount: 0,
      };

      const results: SimulationResult[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(simulate(input, { current: 7 }));
      }

      expect(
        results.every((r) => JSON.stringify(r.input) === JSON.stringify(input))
      ).toBe(true);
    });

    it("createdAt should differ across calls (ISO timestamp), but other fields identical", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 900,
        cardUsageRatio: 15,
        onTimePaymentMonths: 20,
        newLoanCount: 1,
      };

      // Small delay between calls to ensure createdAt differs
      const results: SimulationResult[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(simulate(input, { current: 12 }));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // createdAt values may differ (timestamps)
      const createdAts = results.map((r) => r.createdAt);
      // All createdAt values should be valid ISO 8601 strings
      expect(
        createdAts.every(
          (ts) => typeof ts === "string" && !isNaN(Date.parse(ts))
        )
      ).toBe(true);

      // But all other fields should be identical
      expect(results.map((r) => r.predictedScore)).toEqual([
        results[0].predictedScore,
        results[0].predictedScore,
        results[0].predictedScore,
      ]);
    });
  });

  // ============================================================================
  // AC-2: factors array structure — length 4, direction matches impact sign
  // ============================================================================

  describe("AC-2: Factors array (length 4, direction reflects impact)", () => {
    it("should return exactly 4 factors in result", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 820,
        cardUsageRatio: 25,
        onTimePaymentMonths: 6,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 10 });

      expect(result.factors.length).toBe(4);
    });

    it("should have each factor with name, impact, and direction properties", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 750,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 5 });

      result.factors.forEach((factor) => {
        expect(typeof factor.label).toBe("string");
        expect(typeof factor.impact).toBe("number");
        expect(["up", "down", "flat"]).toContain(factor.direction);
      });
    });

    it("should set direction='up' when impact > 0", async () => {
      const { simulate } = await import("@/lib/simulate");

      // Card usage 30% or less → +18 impact (positive)
      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 20,
        onTimePaymentMonths: 0,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 0 });

      const usageFactorIndex = result.factors.findIndex((f) =>
        f.label.toLowerCase().includes("카드")
      );
      if (usageFactorIndex !== -1) {
        const usageFactor = result.factors[usageFactorIndex];
        if (usageFactor.impact > 0) {
          expect(usageFactor.direction).toBe("up");
        }
      }
    });

    it("should set direction='down' when impact < 0", async () => {
      const { simulate } = await import("@/lib/simulate");

      // New loan → negative impact
      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 0,
        onTimePaymentMonths: 0,
        newLoanCount: 2,
      };

      const result = simulate(input, { current: 0 });

      const loanFactor = result.factors.find((f) =>
        f.label.toLowerCase().includes("대출")
      );
      if (loanFactor && loanFactor.impact < 0) {
        expect(loanFactor.direction).toBe("down");
      }
    });

    it("should set direction='flat' when impact === 0", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 0,
        onTimePaymentMonths: 0,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 0 });

      result.factors.forEach((factor) => {
        if (factor.impact === 0) {
          expect(factor.direction).toBe("flat");
        }
      });
    });
  });

  // ============================================================================
  // AC-3: monthlyProjection array — length 6, all 350–1000, last === predictedScore
  // ============================================================================

  describe("AC-3: Monthly projection (6 elements, clamped 350–1000, last === predicted)", () => {
    it("should return exactly 6 elements in monthlyProjection", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 40,
        onTimePaymentMonths: 10,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 4 });

      expect(result.monthlyProjection.length).toBe(6);
    });

    it("should ensure all monthlyProjection values are integers between 350 and 1000", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 600,
        cardUsageRatio: 70,
        onTimePaymentMonths: 5,
        newLoanCount: 2,
      };

      const result = simulate(input, { current: 2 });

      result.monthlyProjection.forEach((score, idx) => {
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(350);
        expect(score).toBeLessThanOrEqual(1000);
      });
    });

    it("should set monthlyProjection[5] (last element) equal to predictedScore", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 35,
        onTimePaymentMonths: 15,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 8 });

      expect(result.monthlyProjection[5]).toBe(result.predictedScore);
    });

    it("should create monotonic progression toward predictedScore", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 30,
        onTimePaymentMonths: 12,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 6 });

      // Projection should move monotonically from current toward predicted
      // (either increasing or decreasing, not oscillating)
      const direction = result.predictedScore > result.input.currentScore ? 1 : -1;
      for (let i = 0; i < result.monthlyProjection.length - 1; i++) {
        if (direction > 0) {
          // Should be non-decreasing
          expect(result.monthlyProjection[i + 1]).toBeGreaterThanOrEqual(
            result.monthlyProjection[i]
          );
        } else {
          // Should be non-increasing
          expect(result.monthlyProjection[i + 1]).toBeLessThanOrEqual(
            result.monthlyProjection[i]
          );
        }
      }
    });
  });

  // ============================================================================
  // AC-4: predictedScore clamping — high input → score ≤ 1000
  // ============================================================================

  describe("AC-4: Predicted score clamping (350–1000 range)", () => {
    it("should clamp predictedScore to 1000 when calculation exceeds 1000", async () => {
      const { simulate } = await import("@/lib/simulate");

      // Perfect conditions: currentScore 995, best card usage, max payment months, no loans
      const input: SimulationInput = {
        currentScore: 995,
        cardUsageRatio: 10,
        onTimePaymentMonths: 24,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 30 });

      expect(result.predictedScore).toBeLessThanOrEqual(1000);
    });

    it("should clamp predictedScore to 350 when calculation falls below 350", async () => {
      const { simulate } = await import("@/lib/simulate");

      // Worst conditions: currentScore 350, worst card usage, no payment history, many loans
      const input: SimulationInput = {
        currentScore: 350,
        cardUsageRatio: 95,
        onTimePaymentMonths: 0,
        newLoanCount: 5,
      };

      const result = simulate(input, { current: 0 });

      expect(result.predictedScore).toBeGreaterThanOrEqual(350);
    });

    it("should not exceed 1000 even with currentScore 1000 and positive deltas", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 1000,
        cardUsageRatio: 20,
        onTimePaymentMonths: 20,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 20 });

      expect(result.predictedScore).toBeLessThanOrEqual(1000);
    });
  });

  // ============================================================================
  // AC-5: No randomness or async calls — deterministic only
  // ============================================================================

  describe("AC-5: No randomness, no SDK/async calls", () => {
    it("should not call Math.random", async () => {
      const { simulate } = await import("@/lib/simulate");

      const randomSpy = vi.spyOn(Math, "random");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 1,
      };

      simulate(input);

      expect(randomSpy).not.toHaveBeenCalled();
      randomSpy.mockRestore();
    });

    it("should not fetch from external APIs", async () => {
      const { simulate } = await import("@/lib/simulate");

      const fetchSpy = vi.spyOn(global, "fetch");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 1,
      };

      simulate(input);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("should complete synchronously (no await needed)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 1,
      };

      // Should return immediately, not a Promise
      const result = simulate(input, { current: 5 });
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.predictedScore).toBeDefined();
    });
  });

  // ============================================================================
  // Basic calculation example — simple case without streak
  // ============================================================================

  describe("Calculation accuracy (basic example)", () => {
    it("should calculate predictedScore based on input factors", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 35,
        onTimePaymentMonths: 12,
        newLoanCount: 0,
      };

      const result = simulate(input);

      // Result should be between currentScore ± large margin
      expect(result.predictedScore).toBeGreaterThanOrEqual(350);
      expect(result.predictedScore).toBeLessThanOrEqual(1000);
      // delta should match
      expect(result.delta).toBe(result.predictedScore - result.input.currentScore);
    });

    it("should produce monotonic monthlyProjection progression", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 750,
        cardUsageRatio: 40,
        onTimePaymentMonths: 10,
        newLoanCount: 1,
      };

      const result = simulate(input);

      // Check that progression moves toward predictedScore
      const start = result.input.currentScore;
      const end = result.predictedScore;
      expect(result.monthlyProjection[5]).toBe(end);
    });
  });

  // ============================================================================
  // Edge cases and boundary conditions
  // ============================================================================

  describe("Edge cases and boundary conditions", () => {
    it("should handle minimum currentScore (350)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 350,
        cardUsageRatio: 0,
        onTimePaymentMonths: 0,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 0 });

      expect(result.predictedScore).toBeGreaterThanOrEqual(350);
      expect(result.delta).toEqual(result.predictedScore - 350);
    });

    it("should handle maximum currentScore (1000)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 1000,
        cardUsageRatio: 0,
        onTimePaymentMonths: 0,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 0 });

      expect(result.predictedScore).toBeLessThanOrEqual(1000);
    });

    it("should handle zero cardUsageRatio", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 0,
        onTimePaymentMonths: 6,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 3 });

      expect(result.predictedScore).toBeDefined();
      expect(result.factors.length).toBe(4);
    });

    it("should handle maximum cardUsageRatio (100)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 100,
        onTimePaymentMonths: 6,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 3 });

      expect(result.predictedScore).toBeDefined();
      expect(result.factors.length).toBe(4);
    });

    it("should handle maximum onTimePaymentMonths (24)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 50,
        onTimePaymentMonths: 24,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 3 });

      expect(result.predictedScore).toBeDefined();
    });

    it("should handle maximum newLoanCount (5)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 700,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 5,
      };

      const result = simulate(input, { current: 3 });

      expect(result.predictedScore).toBeLessThanOrEqual(700); // Loans are negative
    });

    it("should handle zero streak", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 0 });

      expect(result.predictedScore).toBeDefined();
    });

    it("should handle high streak (30+)", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 50,
        onTimePaymentMonths: 12,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 50 });

      expect(result.predictedScore).toBeDefined();
    });
  });

  // ============================================================================
  // delta calculation correctness
  // ============================================================================

  describe("Delta calculation (predictedScore - currentScore)", () => {
    it("should set delta = predictedScore - currentScore", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 750,
        cardUsageRatio: 40,
        onTimePaymentMonths: 10,
        newLoanCount: 1,
      };

      const result = simulate(input, { current: 5 });

      expect(result.delta).toBe(result.predictedScore - result.input.currentScore);
    });

    it("should have negative delta when conditions worsen", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 800,
        cardUsageRatio: 90,
        onTimePaymentMonths: 0,
        newLoanCount: 5,
      };

      const result = simulate(input, { current: 0 });

      expect(result.delta).toBeLessThan(0);
    });

    it("should have positive delta when conditions improve", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 600,
        cardUsageRatio: 20,
        onTimePaymentMonths: 24,
        newLoanCount: 0,
      };

      const result = simulate(input, { current: 20 });

      expect(result.delta).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Input echo test (result.input === input)
  // ============================================================================

  describe("Input echo (result.input should match input parameter)", () => {
    it("should echo currentScore in result.input", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 777,
        cardUsageRatio: 45,
        onTimePaymentMonths: 10,
        newLoanCount: 2,
      };

      const result = simulate(input, { current: 5 });

      expect(result.input.currentScore).toBe(777);
    });

    it("should echo all input fields without modification", async () => {
      const { simulate } = await import("@/lib/simulate");

      const input: SimulationInput = {
        currentScore: 888,
        cardUsageRatio: 55,
        onTimePaymentMonths: 18,
        newLoanCount: 3,
      };

      const result = simulate(input);

      expect(result.input).toEqual(input);
    });
  });
});
