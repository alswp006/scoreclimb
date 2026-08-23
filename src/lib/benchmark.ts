import type { CreditProfile, DailyMissionLog, MissionDefinition } from "@/lib/types";
import { PEER_BENCHMARKS, MISSION_DEFINITIONS } from "@/lib/constants";

/** Age band key for peer comparison */
export type PeerBand = "20-24" | "25-29" | "30-34" | "35-39" | "40+";

/** Peer benchmark for an age band (distinct from types.ts PeerBenchmark shape) */
export interface AgeBandBenchmark {
  band: PeerBand;
  avgScore: number;
  avgCardUsageRatio: number;
}

/** Card usage ratio average per band — PEER_BENCHMARKS has no usage field, so it's kept here */
const BAND_AVG_CARD_USAGE_RATIO: Record<PeerBand, number> = {
  "20-24": 42,
  "25-29": 38,
  "30-34": 34,
  "35-39": 30,
  "40+": 26,
};

function bandFromAge(age: number): PeerBand {
  if (age < 25) return "20-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  return "40+";
}

/** Derives the peer age band for a birth year as of `todayKey` (YYYY-MM-DD) */
export function getBand(birthYear: number, todayKey: string): PeerBand {
  const todayYear = Number(todayKey.slice(0, 4));
  const age = todayYear - birthYear;
  return bandFromAge(age);
}

const BAND_AGE_MIN: Record<PeerBand, number> = {
  "20-24": 20,
  "25-29": 25,
  "30-34": 30,
  "35-39": 35,
  "40+": 40,
};

function bandEntry(band: PeerBand) {
  const entry = PEER_BENCHMARKS.find((b) => b.ageMin === BAND_AGE_MIN[band]);
  if (!entry) {
    throw new Error(`No peer benchmark found for band: ${band}`);
  }
  return entry;
}

/** Returns the peer benchmark (avgScore from PEER_BENCHMARKS, avgCardUsageRatio local table) for a band */
export function getBenchmark(band: PeerBand): AgeBandBenchmark {
  const entry = bandEntry(band);
  return {
    band,
    avgScore: entry.averageScore,
    avgCardUsageRatio: BAND_AVG_CARD_USAGE_RATIO[band],
  };
}

interface PeerComparisonInput {
  band: PeerBand;
  avgScore: number;
  avgCardUsageRatio: number;
}

/** Comparison result between a profile and its peer benchmark */
export interface PeerComparison {
  scoreDiff: number;
  usageDiff: number;
  scoreVerdict: "above" | "similar" | "below";
}

const SIMILAR_THRESHOLD = 10;

/** Compares a credit profile against a peer benchmark */
export function compareToPeer(
  profile: CreditProfile,
  benchmark: PeerComparisonInput
): PeerComparison {
  const scoreDiff = profile.score - benchmark.avgScore;
  const usageDiff = profile.cardUsageRatio - benchmark.avgCardUsageRatio;

  let scoreVerdict: PeerComparison["scoreVerdict"];
  if (Math.abs(scoreDiff) <= SIMILAR_THRESHOLD) {
    scoreVerdict = "similar";
  } else if (scoreDiff > 0) {
    scoreVerdict = "above";
  } else {
    scoreVerdict = "below";
  }

  return { scoreDiff, usageDiff, scoreVerdict };
}

const MAX_RECOMMENDED_MISSIONS = 3;
const HIGH_CARD_USAGE_THRESHOLD = 30;
/** Any active loan (count > 0) boosts debt-category mission priority */
const MIN_LOAN_COUNT_FOR_BOOST = 0;

function priorityScore(mission: MissionDefinition, profile: CreditProfile): number {
  let score = mission.points;

  if (mission.category === "creditUsage" && profile.cardUsageRatio > HIGH_CARD_USAGE_THRESHOLD) {
    score += (profile.cardUsageRatio - HIGH_CARD_USAGE_THRESHOLD) * 2;
  }

  if (mission.category === "debt" && profile.loanCount > MIN_LOAN_COUNT_FOR_BOOST) {
    score += profile.loanCount * 10;
  }

  if (mission.category === "payment") {
    score += 5;
  }

  return score;
}

/** Recommends up to 3 incomplete missions, prioritized by card usage ratio and loan count */
export function recommendMissions(
  profile: CreditProfile,
  todayLog: DailyMissionLog
): MissionDefinition[] {
  const completed = new Set(todayLog.completedMissionIds);

  return MISSION_DEFINITIONS.filter((mission) => !completed.has(mission.id))
    .map((mission, index) => ({ mission, index, score: priorityScore(mission, profile) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, MAX_RECOMMENDED_MISSIONS)
    .map((entry) => entry.mission);
}
