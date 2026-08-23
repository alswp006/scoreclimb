import type { MissionDefinition, BadgeDefinition, AppFlags, StreakState, BadgeState } from "@/lib/types";

/** localStorage key table — all keys share the `scoreclimb.*.v1` namespace */
export const STORAGE_KEYS = {
  profile: "scoreclimb.profile.v1",
  scoreHistory: "scoreclimb.scoreHistory.v1",
  missionLogs: "scoreclimb.missionLogs.v1",
  streak: "scoreclimb.streak.v1",
  badges: "scoreclimb.badges.v1",
  lastSimulation: "scoreclimb.lastSimulation.v1",
  flags: "scoreclimb.flags.v1",
} as const;

/** Daily mission catalog — points must sum to 12 */
export const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: "m_card_usage",
    title: "카드 사용률 30% 이하 유지",
    description: "오늘 카드 사용액을 한도의 30% 아래로 관리해요",
    category: "creditUsage",
    points: 2,
    impact: "positive",
  },
  {
    id: "m_no_late",
    title: "연체 없이 하루 보내기",
    description: "오늘 결제일이 있다면 늦지 않게 처리해요",
    category: "payment",
    points: 3,
    impact: "positive",
  },
  {
    id: "m_auto_pay",
    title: "자동이체 설정 확인",
    description: "카드값 자동이체가 걸려 있는지 확인해요",
    category: "payment",
    points: 2,
    impact: "positive",
  },
  {
    id: "m_no_cash_advance",
    title: "현금서비스 이용 안 하기",
    description: "오늘 하루 현금서비스·리볼빙을 쓰지 않아요",
    category: "debt",
    points: 2,
    impact: "positive",
  },
  {
    id: "m_score_check",
    title: "신용점수 확인하기",
    description: "오늘 내 신용점수를 한 번 확인해요",
    category: "creditUsage",
    points: 1,
    impact: "neutral",
  },
  {
    id: "m_debt_plan",
    title: "대출 상환 계획 점검",
    description: "이번 달 상환액과 잔액을 확인해요",
    category: "debt",
    points: 2,
    impact: "positive",
  },
];

/** Extends BadgeDefinition with the unlock condition string (`kind:threshold`) */
export type BadgeDefinitionWithCondition = BadgeDefinition & {
  condition: string;
};

export const BADGE_DEFINITIONS: BadgeDefinitionWithCondition[] = [
  {
    id: "b_first_mission",
    name: "첫 걸음",
    description: "첫 미션을 완료했어요",
    icon: "footprints",
    condition: "totalMissions:1",
  },
  {
    id: "b_streak_3",
    name: "3일 연속",
    description: "3일 연속 미션을 완료했어요",
    icon: "flame",
    condition: "streak:3",
  },
  {
    id: "b_streak_7",
    name: "일주일 완주",
    description: "7일 연속 미션을 완료했어요",
    icon: "flame",
    condition: "streak:7",
  },
  {
    id: "b_streak_30",
    name: "한 달 챔피언",
    description: "30일 연속 미션을 완료했어요",
    icon: "trophy",
    condition: "streak:30",
  },
  {
    id: "b_total_50",
    name: "습관의 힘",
    description: "누적 미션 50개를 완료했어요",
    icon: "medal",
    condition: "totalMissions:50",
  },
  {
    id: "b_simulation",
    name: "미래 설계자",
    description: "점수 시뮬레이션을 처음 실행했어요",
    icon: "compass",
    condition: "simulation:1",
  },
];

/** Age-band peer benchmark for credit score comparison (ageMax=null means open-ended) */
export type PeerBenchmarkBand = {
  ageMin: number;
  ageMax: number | null;
  averageScore: number;
  sampleSize: number;
};

export const PEER_BENCHMARKS: PeerBenchmarkBand[] = [
  { ageMin: 20, ageMax: 24, averageScore: 720, sampleSize: 42 },
  { ageMin: 25, ageMax: 29, averageScore: 780, sampleSize: 38 },
  { ageMin: 30, ageMax: 34, averageScore: 830, sampleSize: 34 },
  { ageMin: 35, ageMax: 39, averageScore: 860, sampleSize: 31 },
  { ageMin: 40, ageMax: null, averageScore: 875, sampleSize: 29 },
];

export const DEFAULT_FLAGS: AppFlags = {
  onboardingDone: false,
  disclaimerAckedAt: null,
};

export const DEFAULT_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastCompletedDate: null,
  totalCompletedMissions: 0,
};

export const DEFAULT_BADGES: BadgeState = {
  unlockedBadgeIds: [],
  unlockedAt: {},
};

/** Retention ceilings — storage layer prunes beyond these */
export const MAX_MISSION_LOG_DAYS = 180;
export const MAX_SCORE_HISTORY = 90;
export const PRUNE_MISSION_LOG_DAYS = 90;
export const PRUNE_SCORE_HISTORY_DAYS = 60;
