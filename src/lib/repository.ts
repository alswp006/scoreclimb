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
import {
  STORAGE_KEYS,
  DEFAULT_FLAGS,
  DEFAULT_STREAK,
  DEFAULT_BADGES,
  MAX_MISSION_LOG_DAYS,
  MAX_SCORE_HISTORY,
} from "@/lib/constants";
import { storage } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Type guards — hand-written (no zod). Validate shape only; range validation
// for CreditProfile happens separately at save-time via validateProfile().
// ---------------------------------------------------------------------------

function isCreditProfile(v: unknown): v is CreditProfile {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.score === "number" &&
    typeof p.birthYear === "number" &&
    typeof p.cardUsageRatio === "number" &&
    typeof p.loanCount === "number" &&
    typeof p.updatedAt === "string"
  );
}

function isScoreSnapshot(v: unknown): v is ScoreSnapshot {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.date === "string" && typeof s.score === "number";
}

function isScoreHistory(v: unknown): v is ScoreSnapshot[] {
  return Array.isArray(v) && v.every(isScoreSnapshot);
}

function isDailyMissionLog(v: unknown): v is DailyMissionLog {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.date === "string" &&
    Array.isArray(l.completedMissionIds) &&
    l.completedMissionIds.every((id) => typeof id === "string") &&
    typeof l.totalPoints === "number"
  );
}

function isMissionLogMap(v: unknown): v is MissionLogMap {
  if (typeof v !== "object" || v === null) return false;
  return Object.values(v as Record<string, unknown>).every(isDailyMissionLog);
}

function isStreakState(v: unknown): v is StreakState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.current === "number" &&
    typeof s.longest === "number" &&
    (typeof s.lastCompletedDate === "string" || s.lastCompletedDate === null) &&
    typeof s.totalCompletedMissions === "number"
  );
}

function isBadgeState(v: unknown): v is BadgeState {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Record<string, unknown>;
  return (
    Array.isArray(b.unlockedBadgeIds) &&
    b.unlockedBadgeIds.every((id) => typeof id === "string") &&
    typeof b.unlockedAt === "object" &&
    b.unlockedAt !== null
  );
}

function isAppFlags(v: unknown): v is AppFlags {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Record<string, unknown>;
  return (
    typeof f.onboardingDone === "boolean" &&
    (typeof f.disclaimerAckedAt === "string" || f.disclaimerAckedAt === null)
  );
}

function isSimulationResult(v: unknown): v is SimulationResult {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.input === "object" &&
    s.input !== null &&
    typeof s.predictedScore === "number" &&
    typeof s.delta === "number" &&
    Array.isArray(s.monthlyProjection) &&
    Array.isArray(s.factors) &&
    typeof s.createdAt === "string"
  );
}

// ---------------------------------------------------------------------------
// Range validation (Korean messages, exact strings required by spec)
// ---------------------------------------------------------------------------

function validateProfile(profile: Omit<CreditProfile, "updatedAt">): string | null {
  if (profile.score < 350 || profile.score > 1000) {
    return "점수는 350~1000 사이여야 해요";
  }
  if (profile.birthYear < 1960 || profile.birthYear > 2010) {
    return "출생연도는 1960~2010 사이여야 해요";
  }
  if (profile.cardUsageRatio < 0 || profile.cardUsageRatio > 100) {
    return "카드 사용률은 0~100 사이여야 해요";
  }
  if (profile.loanCount < 0 || profile.loanCount > 10) {
    return "대출 건수는 0~10 사이여야 해요";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function loadProfile(): CreditProfile | null {
  return storage.get<CreditProfile | null>(
    STORAGE_KEYS.profile,
    null,
    (v): v is CreditProfile | null => v === null || isCreditProfile(v)
  );
}

export function saveProfile(profile: Omit<CreditProfile, "updatedAt">): SaveResult {
  const error = validateProfile(profile);
  if (error) return { ok: false, error };
  const full: CreditProfile = { ...profile, updatedAt: new Date().toISOString() };
  return storage.set(STORAGE_KEYS.profile, full);
}

// ---------------------------------------------------------------------------
// Score history (max 90, FIFO)
// ---------------------------------------------------------------------------

export function loadScoreHistory(): ScoreSnapshot[] {
  return storage.get<ScoreSnapshot[]>(STORAGE_KEYS.scoreHistory, [], isScoreHistory);
}

export function upsertSnapshot(snapshot: ScoreSnapshot): SaveResult {
  const history = loadScoreHistory();
  const idx = history.findIndex((s) => s.date === snapshot.date);
  const next = idx >= 0 ? history.slice() : [...history, snapshot];
  if (idx >= 0) next[idx] = snapshot;

  const trimmed =
    next.length > MAX_SCORE_HISTORY
      ? next.slice(next.length - MAX_SCORE_HISTORY)
      : next;

  return storage.set(STORAGE_KEYS.scoreHistory, trimmed);
}

// ---------------------------------------------------------------------------
// Mission logs (max 180 days, FIFO by date key)
// ---------------------------------------------------------------------------

export function loadMissionLogs(): MissionLogMap {
  return storage.get<MissionLogMap>(STORAGE_KEYS.missionLogs, {}, isMissionLogMap);
}

export function saveMissionLog(log: DailyMissionLog): SaveResult {
  const logs = loadMissionLogs();
  const next: MissionLogMap = { ...logs, [log.date]: log };

  const dates = Object.keys(next).sort();
  if (dates.length > MAX_MISSION_LOG_DAYS) {
    for (const date of dates.slice(0, dates.length - MAX_MISSION_LOG_DAYS)) {
      delete next[date];
    }
  }

  return storage.set(STORAGE_KEYS.missionLogs, next);
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export function loadStreak(): StreakState {
  return storage.get<StreakState>(STORAGE_KEYS.streak, DEFAULT_STREAK, isStreakState);
}

export function saveStreak(streak: StreakState): SaveResult {
  return storage.set(STORAGE_KEYS.streak, streak);
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function loadBadges(): BadgeState {
  return storage.get<BadgeState>(STORAGE_KEYS.badges, DEFAULT_BADGES, isBadgeState);
}

export function saveBadges(badges: BadgeState): SaveResult {
  return storage.set(STORAGE_KEYS.badges, badges);
}

// ---------------------------------------------------------------------------
// Last simulation
// ---------------------------------------------------------------------------

export function loadLastSimulation(): SimulationResult | null {
  return storage.get<SimulationResult | null>(
    STORAGE_KEYS.lastSimulation,
    null,
    (v): v is SimulationResult | null => v === null || isSimulationResult(v)
  );
}

export function saveLastSimulation(result: SimulationResult): SaveResult {
  return storage.set(STORAGE_KEYS.lastSimulation, result);
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

export function loadFlags(): AppFlags {
  return storage.get<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS, isAppFlags);
}

export function saveFlags(flags: AppFlags): SaveResult {
  return storage.set(STORAGE_KEYS.flags, flags);
}
