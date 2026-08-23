// Domain types — Scoreclimb mini app data model
// All types are pure TypeScript interfaces/types — no runtime values/enums/functions

/** Credit profile snapshot */
export interface CreditProfile {
  /** Credit score (350~1000) */
  score: number;
  /** Year of birth (1960~2010) */
  birthYear: number;
  /** Card usage ratio percentage (0~100) */
  cardUsageRatio: number;
  /** Number of active loans (0~10) */
  loanCount: number;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/** Single credit score point in time */
export interface ScoreSnapshot {
  date: string;
  score: number;
}

/** Daily mission definition */
export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  points: number;
  impact: "positive" | "neutral" | "negative";
}

/** Mission category */
export type MissionCategory =
  | "spending"
  | "saving"
  | "payment"
  | "creditUsage"
  | "debt";

/** Daily mission log entry */
export interface DailyMissionLog {
  date: string;
  completedMissionIds: string[];
  totalPoints: number;
}

/** Map of all mission logs by date */
export type MissionLogMap = Record<string, DailyMissionLog>;

/** Consecutive mission completion streak state */
export interface StreakState {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
  totalCompletedMissions: number;
}

/** Badge definition */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** User badge unlock state */
export interface BadgeState {
  unlockedBadgeIds: string[];
  unlockedAt: Record<string, string>;
}

/** Simulation input parameters */
export interface SimulationInput {
  monthlySaving: number;
  creditUtilization: number;
  paymentHistory: "onTime" | "late" | "mixed";
  savingsDuration: number;
}

/** Direction of factor impact */
export type FactorDirection = "positive" | "negative" | "neutral";

/** Individual factor in simulation */
export interface SimulationFactor {
  name: string;
  description: string;
  impact: FactorDirection;
  contribution: number;
}

/** Simulation result with projection */
export interface SimulationResult {
  input: SimulationInput;
  predictedScore: number;
  delta: number;
  monthlyProjection: Array<{ month: number; score: number }>;
  factors: SimulationFactor[];
  createdAt: string;
}

/** Peer benchmark comparison */
export interface PeerBenchmark {
  percentile: number;
  averageScore: number;
  highScore: number;
  lowScore: number;
}

/** App-level feature flags */
export interface AppFlags {
  onboardingDone: boolean;
  disclaimerAckedAt: string | null;
}

/** Save operation result */
export type SaveResult =
  | { ok: true; error?: undefined }
  | { ok: false; error: string };

/** Route state for React Router navigation */
export type RouteState = {
  "/onboarding": { step?: number };
  "/": undefined;
  "/missions": undefined;
  "/badges": undefined;
  "/simulate": undefined;
  "/simulate/result": { result: SimulationResult } | undefined;
  "/report": undefined;
};
