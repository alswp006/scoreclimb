import { STORAGE_KEYS, PRUNE_MISSION_LOG_DAYS, PRUNE_SCORE_HISTORY_DAYS } from "@/lib/constants";
import type { SaveResult, MissionLogMap, ScoreSnapshot } from "@/lib/types";
import { diffDays, parseDateKey } from "@/lib/date";

export type { SaveResult };

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  );
}

/** Read + validate a stored value, falling back (and self-healing corrupted keys) on failure. */
function get<T>(key: string, fallback: T, guard?: (v: unknown) => v is T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }

  if (parsed === undefined || (guard && !guard(parsed))) {
    try {
      localStorage.setItem(key, JSON.stringify(fallback));
    } catch {
      // best-effort repair only — fallback is still returned below
    }
    return fallback;
  }

  return parsed as T;
}

/** Write a value, pruning old data and retrying once if the quota is exceeded. */
function set<T>(key: string, value: T): SaveResult {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
    return { ok: true };
  } catch (error) {
    if (!isQuotaExceeded(error)) {
      return { ok: false, error: "저장 공간이 부족해요" };
    }
    try {
      pruneOldData();
      localStorage.setItem(key, json);
      return { ok: true };
    } catch {
      return { ok: false, error: "저장 공간이 부족해요" };
    }
  }
}

export const storage = { get, set };

/** Evict aged-out entries (missionLogs > 90d, scoreHistory > 60d) to free up quota. */
export function pruneOldData(): void {
  const now = new Date();
  pruneMissionLogs(now);
  pruneScoreHistory(now);
}

function pruneMissionLogs(now: Date): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.missionLogs);
    if (!raw) return;
    const logs = JSON.parse(raw) as MissionLogMap;
    if (typeof logs !== "object" || logs === null) return;

    const pruned: MissionLogMap = {};
    for (const [date, log] of Object.entries(logs)) {
      if (diffDays(parseDateKey(date), now) <= PRUNE_MISSION_LOG_DAYS) {
        pruned[date] = log;
      }
    }
    localStorage.setItem(STORAGE_KEYS.missionLogs, JSON.stringify(pruned));
  } catch {
    // best-effort — leave existing data untouched on failure
  }
}

function pruneScoreHistory(now: Date): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.scoreHistory);
    if (!raw) return;
    const history = JSON.parse(raw) as ScoreSnapshot[];
    if (!Array.isArray(history)) return;

    const pruned = history.filter(
      (snapshot) => diffDays(parseDateKey(snapshot.date), now) <= PRUNE_SCORE_HISTORY_DAYS
    );
    localStorage.setItem(STORAGE_KEYS.scoreHistory, JSON.stringify(pruned));
  } catch {
    // best-effort — leave existing data untouched on failure
  }
}
