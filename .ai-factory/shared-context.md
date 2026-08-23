# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 앱 라우팅 상태 열거 (구현: 패킷 0001) */
export type RouteState = 'onboarding' | 'home' | 'missions' | 'badges' | 'simulate' | 'simulateResult' | 'report';

/** 사용자 정보 핵심 필드 (구현: 패킷 0001) */
export type User = { id: string; name: string; startDate: string; createdAt: string };

/** 미션 엔티티 (구현: 패킷 0001) */
export type Mission = { id: string; category: string; status: 'pending' | 'completed'; completedAt?: string; amountKrw: number };

/** 활동 레코드 (구현: 패킷 0001) */
export type Activity = { date: string; type: 'mission' | 'manual'; amountKrw: number };

/** 배지 엔티티 (구현: 패킷 0001) */
export type Badge = { id: string; name: string; unlockedAt: string; threshold: number };

/** 시뮬레이션 입력값 (구현: 패킷 0001) */
export type SimulationInput = { initialAmount: number; monthlyContribution: number; interestRate: number; months: number };

/** 시뮬레이션 결과 (구현: 패킷 0001) */
export type SimulationResult = { finalAmount: number; totalInterest: number; timeline: { month: number; amount: number }[] };

/** 스토리지 읽기 (JSON parse 포함) (구현: 패킷 0003) */
export type getItemFn = <T>(key: string) => T | null;

/** 스토리지 쓰기 (JSON stringify 포함) (구현: 패킷 0003) */
export type setItemFn = <T>(key: string, value: T) => void;

/** 날짜 계산 유틸 (구현: 패킷 0003) */
export type addDaysFn = (date: Date, days: number) => Date;

/** 날짜 비교 유틸 (구현: 패킷 0003) */
export type isSameDayFn = (d1: Date, d2: Date) => boolean;

/** 사용자 조회 (구현: 패킷 0004) */
export type getUserDataFn = () => User | null;

/** 사용자 저장 (구현: 패킷 0004) */
export type setUserDataFn = (user: User) => void;

/** 미션 목록 조회 (구현: 패킷 0004) */
export type getMissionsFn = () => Mission[];

/** 미션 목록 저장 (구현: 패킷 0004) */
export type saveMissionsFn = (missions: Mission[]) => void;

/** 스트릭 계산 순수 함수 (구현: 패킷 0005) */
export type calculateStreakFn = (activities: Activity[], today: Date) => { current: number; longest: number };

/** 달성 가능한 배지 목록 (구현: 패킷 0005) */
export type getBadgeCandidatesFn = (activities: Activity[], currentStreak: number) => Badge[];

/** 자산 시뮬레이션 엔진 (구현: 패킷 0006) */
export type simulateFn = (input: SimulationInput) => SimulationResult;

/** 앱 상태 훅 (모든 페이지의 데이터 출입구) (구현: 패킷 0008) */
export type useAppDataFn = () => { user: User | null; missions: Mission[]; activities: Activity[]; updateMission: (id: string, status: 'completed') => Promise<void> };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
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
  /** Current credit score (350~1000) */
  currentScore: number;
  /** Card usage ratio percentage (0~100) */
  cardUsageRatio: number;
  /** Consecutive months with on-time payments (0~24) */
  onTimePaymentMonths: number;
  /** Number of newly opened loans (0~5) */
  newLoanCount: number;
}

/** Direction of factor impact */
export type FactorDirection = "up" | "down" | "flat";

/** Individual factor in simulation */
export interface SimulationFactor {
  label: string;
  impact: number;
  direction: FactorDirection;
}

/** Simulation result with projection */
export interface SimulationResult {
  input: SimulationInput;
  predictedScore: number;
  delta: number;
  /** 6-month score projection, monotonic toward predictedScore, each clamped 350~1000 */
  monthlyProjection: number[];
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

/** Route state f
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    common.tsx
  hooks/
    useAppData.ts
  lib/
    badges.ts
    benchmark.ts
    compliance.ts
    constants.ts
    contract.ts
    date.ts
    repository.ts
    simulate.ts
    storage.ts
    streak.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Badges.tsx
    Home.tsx
    Missions.tsx
    Onboarding.tsx
    Report.tsx
    Simulate.tsx
    SimulateResult.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
    vitest-jest-dom.d.ts
  vite-env.d.ts

### Exports (src/lib/)
- badges.ts: export interface BadgeEvalContext; export function evaluateBadges( prev: BadgeState, ctx: BadgeEvalContext, nowIso: string ):
- benchmark.ts: export type PeerBand = "20-24" | "25-29" | "30-34" | "35-39" | "40+"; export interface AgeBandBenchmark; export function getBand(birthYear: number, todayKey: string): PeerBand; export function getBenchmark(band: PeerBand): AgeBandBenchmark; export interface PeerComparison; export function compareToPeer( profile: CreditProfile, benchmark: PeerComparisonInput ): PeerComparison; export function recommendMissions( profile: CreditProfile, todayLog: DailyMissionLog ): MissionDefinition[]
- compliance.ts: export interface ComplianceRule; export type ComplianceRuleId = | 'hex-color' | 'external-navigation' | 'blank-target' | 'promotion-reward' | 'install-pr; export const EXTERNAL_ANALYTICS_PACKAGES: readonly string[] = [ 'google-analytics', 'gtag', 'amplitude', 'mixpanel', 'se; export const PROHIBITED_PATTERNS: readonly ComplianceRule[] = [; export function findComplianceViolations(source: string): ComplianceRuleId[]; export function isProhibitedCopy(text: string): boolean; export function hasAdConfig(): boolean; export function shouldRenderAd(slotIdentifier?: string | null): boolean
- constants.ts: export const STORAGE_KEYS =; export const MISSION_DEFINITIONS: MissionDefinition[] = [; export type BadgeDefinitionWithCondition = BadgeDefinition &; export const BADGE_DEFINITIONS: BadgeDefinitionWithCondition[] = [; export type PeerBenchmarkBand =; export const PEER_BENCHMARKS: PeerBenchmarkBand[] = [; export const DEFAULT_FLAGS: AppFlags =; export const DEFAULT_STREAK: StreakState =
- contract.ts: export type RouteState = 'onboarding' | 'home' | 'missions' | 'badges' | 'simulate' | 'simulateResult' | 'report'; export type User =; export type Mission =; export type Activity =; export type Badge =; export type SimulationInput =; export type SimulationResult =; export type getItemFn = <T>(key: string) => T | null
- date.ts: export function todayKey(date: Date = new Date()): string; export function parseDateKey(key: string): Date; export function diffDays(d1: Date, d2: Date): number; export function isSameDay(d1: Date, d2: Date): boolean; export function addDays(date: Date, days: number): Date
- repository.ts: export function loadProfile(): CreditProfile | null; export function saveProfile(profile: Omit<CreditProfile, "updatedAt">): SaveResult; export function loadScoreHistory(): ScoreSnapshot[]; export function upsertSnapshot(snapshot: ScoreSnapshot): SaveResult; export function loadMissionLogs(): MissionLogMap; export function saveMissionLog(log: DailyMissionLog): SaveResult; export function loadStreak(): StreakState; export function saveStreak(streak: StreakState): SaveResult
- simulate.ts: export interface SimulationStreakContext; export function simulate( input: SimulationInput, streak?: SimulationStreakContext ): SimulationResult
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export const storage =; export function pruneOldData(): void
- streak.ts: export const STREAK_ATTENDANCE_THRESHOLD = 3; export function computeStreak( prev: StreakState, todayCompletedCount: number, today: string ): StreakState
- types.ts: export interface CreditProfile; export interface ScoreSnapshot; export interface MissionDefinition; export type MissionCategory = | "spending" | "saving" | "payment" | "creditUsage" | "debt"; export interface DailyMissionLog; export type MissionLogMap = Record<string, DailyMissionLog>; export interface StreakState; export interface BadgeDefinition
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShel...
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 데이터 모델 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0002: 고정 상수 테이블 + 스토리지 키 (files: src/lib/constants.ts)
- 0003: 스토리지 코어 + 날짜 유틸 (get/set/prune/quota) (files: src/lib/storage.ts, src/lib/date.ts)
- 0004: 엔티티 CRUD + 범위 검증 타입가드 (files: src/lib/repository.ts)
- 0005: 스트릭 & 배지 도메인 순수 함수 (files: src/lib/streak.ts, src/lib/badges.ts)
- 0006: 시뮬레이션 계산 엔진 simulate() (files: src/lib/simulate.ts)
- 0007: 또래 벤치마크 비교 + 추천 미션 로직 (files: src/lib/benchmark.ts)
- 0008: 앱 상태 훅 useAppData (files: src/hooks/useAppData.ts)
- 0010: S1 온보딩 화면 /onboarding (files: src/pages/Onboarding.tsx)
- 0011: S2 홈 대시보드 / (files: src/pages/Home.tsx)
- 0012: S3 미션 체크리스트 /missions (files: src/pages/Missions.tsx)
- 0013: S4 스트릭 & 배지 화면 /badges (files: src/pages/Badges.tsx)
- 0014: S5 시뮬레이션 입력 /simulate (files: src/pages/Simulate.tsx)
- 0016: S7 또래 비교 리포트 /report (files: src/pages/Report.tsx)
- 0017: 라우팅 트리 + 부트 게이트 + FloatingTabBar 배선 (files: src/App.tsx)
- 0018: 검수 컴플라이언스 스윕 + 빌드 타깃 + 광고 래퍼 점검 (files: vite.config.ts, src/lib/compliance.ts)