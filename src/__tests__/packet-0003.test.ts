import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { storage, type SaveResult } from "@/lib/storage";
import { todayKey, parseDateKey, diffDays, addDays } from "@/lib/date";

describe("스토리지 코어 + 날짜 유틸 (get/set/prune/quota)", () => {
  describe("storage.get — AC-1: corrupted key recovery", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("should return fallback and overwrite key when JSON parse fails", () => {
      // Arrange
      const key = "scoreclimb.streak.v1";
      const corrupted = "null}}";
      const fallback = { days: 0, lastDate: null };

      localStorage.setItem(key, corrupted);
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      // Act
      const result = storage.get(
        key,
        fallback,
        (v): v is typeof fallback =>
          typeof v === "object" && v !== null && "days" in v
      );

      // Assert
      expect(result).toEqual(fallback);
      expect(result.days).toBe(0);
      expect(result.lastDate).toBe(null);
      // Verify that setItem was called to fix the corrupted key
      expect(setItemSpy).toHaveBeenCalledWith(key, JSON.stringify(fallback));

      setItemSpy.mockRestore();
    });

    it("should not throw exception when overwriting corrupted key", () => {
      // Arrange
      const key = "test.corrupted.v1";
      const corrupted = "{broken json";
      const fallback = { value: 123 };

      localStorage.setItem(key, corrupted);

      // Act & Assert
      expect(() => {
        storage.get(key, fallback, (v) => typeof v === "object");
      }).not.toThrow();
    });
  });

  describe("storage.get — AC-2: no write on missing key", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("should return fallback without calling setItem when key does not exist (3 consecutive calls)", () => {
      // Arrange
      const key = "scoreclimb.nonexistent.v1";
      const fallback = { data: "default" };
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

      // Act
      const result1 = storage.get(key, fallback);
      const result2 = storage.get(key, fallback);
      const result3 = storage.get(key, fallback);

      // Assert
      expect(result1).toEqual(fallback);
      expect(result2).toEqual(fallback);
      expect(result3).toEqual(fallback);
      expect(setItemSpy).toHaveBeenCalledTimes(0);

      setItemSpy.mockRestore();
    });

    it("should return fallback with correct values from the object", () => {
      // Arrange
      const key = "scoreclimb.calc.v1";
      const fallback = { amount: 5000, currency: "KRW", updated: true };

      // Act
      const result = storage.get(key, fallback);

      // Assert
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe("KRW");
      expect(result.updated).toBe(true);
    });
  });

  describe("storage.set — AC-3: quota exceeded handling", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    it("should call setItem twice (initial + 1 retry) and return error when quota exceeded on both attempts", () => {
      // Arrange
      const key = "scoreclimb.calc.v1";
      const value = { amount: 5000 };

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const quotaError = new DOMException(
        "QuotaExceededError",
        "QuotaExceededError"
      );

      let attempts = 0;
      setItemSpy.mockImplementation(() => {
        attempts++;
        throw quotaError;
      });

      // Act
      const result = storage.set(key, value);

      // Assert
      expect(result.ok).toBe(false);
      expect(result.error).toBe("저장 공간이 부족해요");
      expect(setItemSpy).toHaveBeenCalledTimes(2);
      expect(attempts).toBe(2);

      setItemSpy.mockRestore();
    });

    it("should return success result {ok: true} on successful set", () => {
      // Arrange
      const key = "scoreclimb.result.v1";
      const value = { total: 100, processed: 50 };

      // Act
      const result = storage.set(key, value);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(localStorage.getItem(key)).toBe(JSON.stringify(value));
    });

    it("should succeed on second attempt after pruneOldData when first attempt fails with quota", () => {
      // Arrange
      const key = "scoreclimb.data.v1";
      const value = { count: 42 };

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const quotaError = new DOMException(
        "QuotaExceededError",
        "QuotaExceededError"
      );

      let attempts = 0;
      setItemSpy.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          throw quotaError;
        }
        // Second attempt succeeds (after pruneOldData)
      });

      // Act
      const result = storage.set(key, value);

      // Assert
      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
      expect(setItemSpy).toHaveBeenCalledTimes(2);
      expect(attempts).toBe(2);

      setItemSpy.mockRestore();
    });

    it("should store value as JSON string", () => {
      // Arrange
      const key = "scoreclimb.test.v1";
      const value = { nested: { field: "value" } };

      // Act
      storage.set(key, value);

      // Assert
      const stored = localStorage.getItem(key);
      expect(stored).toBe(JSON.stringify(value));
      const parsed = JSON.parse(stored!);
      expect(parsed.nested.field).toBe("value");
    });
  });

  describe("todayKey — AC-4: local midnight YYYY-MM-DD", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return YYYY-MM-DD in local timezone", () => {
      // Arrange
      vi.useFakeTimers();
      const testDate = new Date(2026, 7, 24, 15, 30, 45); // Aug 24, 3:30:45 PM local
      vi.setSystemTime(testDate);

      // Act
      const result = todayKey();

      // Assert
      expect(result).toBe("2026-08-24");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should not use toISOString() UTC conversion — stay on local date near midnight", () => {
      // Arrange
      vi.useFakeTimers();
      // Set time to 23:59:59 local time on Aug 24
      const almostMidnight = new Date(2026, 7, 24, 23, 59, 59);
      vi.setSystemTime(almostMidnight);

      // Act
      const result = todayKey();

      // Assert
      // Should still be Aug 24, not Aug 25 (which would happen if using UTC toISOString)
      expect(result).toBe("2026-08-24");
      expect(result).not.toBe("2026-08-25");
    });

    it("should handle year boundaries correctly", () => {
      // Arrange
      vi.useFakeTimers();
      const newYearEve = new Date(2026, 11, 31, 23, 59, 59); // Dec 31, 11:59:59 PM
      vi.setSystemTime(newYearEve);

      // Act
      const result = todayKey();

      // Assert
      expect(result).toBe("2026-12-31");
    });

    it("should handle month boundaries correctly", () => {
      // Arrange
      vi.useFakeTimers();
      const endOfMonth = new Date(2026, 7, 31, 18, 0, 0); // Aug 31, 6:00 PM
      vi.setSystemTime(endOfMonth);

      // Act
      const result = todayKey();

      // Assert
      expect(result).toBe("2026-08-31");
    });
  });

  describe("date utilities — parseDateKey, diffDays, addDays", () => {
    it("parseDateKey should parse YYYY-MM-DD and return local midnight Date", () => {
      // Act
      const result = parseDateKey("2026-08-24");

      // Assert
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(7); // 0-indexed, Aug = 7
      expect(result.getDate()).toBe(24);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("parseDateKey should handle single-digit month and day with leading zeros", () => {
      // Act
      const result = parseDateKey("2026-01-05");

      // Assert
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(5);
    });

    it("diffDays should calculate correct positive difference between two dates", () => {
      // Arrange
      const date1 = new Date(2026, 7, 24); // Aug 24
      const date2 = new Date(2026, 7, 27); // Aug 27

      // Act
      const result = diffDays(date1, date2);

      // Assert
      expect(result).toBe(3);
    });

    it("diffDays should calculate correct negative difference", () => {
      // Arrange
      const date1 = new Date(2026, 7, 27); // Aug 27
      const date2 = new Date(2026, 7, 24); // Aug 24

      // Act
      const result = diffDays(date1, date2);

      // Assert
      expect(result).toBe(-3);
    });

    it("diffDays should return 0 for same date", () => {
      // Arrange
      const date = new Date(2026, 7, 24);

      // Act
      const result = diffDays(date, date);

      // Assert
      expect(result).toBe(0);
    });

    it("diffDays should handle month/year boundaries", () => {
      // Arrange
      const date1 = new Date(2026, 7, 28); // Aug 28
      const date2 = new Date(2026, 8, 3); // Sep 3

      // Act
      const result = diffDays(date1, date2);

      // Assert
      expect(result).toBe(6);
    });

    it("addDays should add positive number of days correctly", () => {
      // Arrange
      const date = new Date(2026, 7, 24); // Aug 24

      // Act
      const result = addDays(date, 7);

      // Assert
      expect(result.getDate()).toBe(31); // Aug 31
      expect(result.getMonth()).toBe(7);
      expect(result.getFullYear()).toBe(2026);
    });

    it("addDays should handle month overflow when adding days", () => {
      // Arrange
      const date = new Date(2026, 7, 28); // Aug 28

      // Act
      const result = addDays(date, 5);

      // Assert
      expect(result.getDate()).toBe(2); // Sep 2
      expect(result.getMonth()).toBe(8); // Sep = 8
      expect(result.getFullYear()).toBe(2026);
    });

    it("addDays should handle year overflow correctly", () => {
      // Arrange
      const date = new Date(2026, 11, 28); // Dec 28

      // Act
      const result = addDays(date, 5);

      // Assert
      expect(result.getDate()).toBe(2); // Jan 2
      expect(result.getMonth()).toBe(0); // Jan = 0
      expect(result.getFullYear()).toBe(2027); // Next year
    });

    it("addDays should handle negative days (subtraction)", () => {
      // Arrange
      const date = new Date(2026, 7, 24); // Aug 24

      // Act
      const result = addDays(date, -5);

      // Assert
      expect(result.getDate()).toBe(19); // Aug 19
      expect(result.getMonth()).toBe(7);
    });

    it("addDays should handle 0 days (return equivalent date)", () => {
      // Arrange
      const date = new Date(2026, 7, 24);

      // Act
      const result = addDays(date, 0);

      // Assert
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(7);
      expect(result.getDate()).toBe(24);
    });
  });

  describe("AC-5: no console.error calls", () => {
    it("storage.ts should not call console.error during normal operations", () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error");

      // Act
      storage.get("test.key.v1", { default: true });
      storage.set("test.key.v1", { data: "test" });
      storage.get("another.key.v1", []);

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("date.ts should not call console.error", () => {
      // Arrange
      const consoleErrorSpy = vi.spyOn(console, "error");

      // Act
      todayKey();
      parseDateKey("2026-08-24");
      diffDays(new Date(2026, 7, 24), new Date(2026, 7, 27));
      addDays(new Date(2026, 7, 24), 7);

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("integration: storage + date utilities", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should store and retrieve date-based streak data", () => {
      // Arrange
      const key = "scoreclimb.streak.v1";
      const streakData = { days: 5, lastDate: todayKey() };

      // Act
      const setResult = storage.set(key, streakData);
      const getResult = storage.get(key, { days: 0, lastDate: null });

      // Assert
      expect(setResult.ok).toBe(true);
      expect(getResult.days).toBe(5);
      expect(getResult.lastDate).toBe(todayKey());
    });

    it("should handle multiple storage keys with different data types", () => {
      // Arrange
      const streakKey = "scoreclimb.streak.v1";
      const calcKey = "scoreclimb.calc.v1";

      // Act
      storage.set(streakKey, { days: 3, lastDate: "2026-08-24" });
      storage.set(calcKey, { amount: 50000, currency: "KRW" });

      // Assert
      const streak = storage.get(streakKey, { days: 0, lastDate: null });
      const calc = storage.get(calcKey, { amount: 0, currency: "KRW" });

      expect(streak.days).toBe(3);
      expect(calc.amount).toBe(50000);
    });
  });
});
