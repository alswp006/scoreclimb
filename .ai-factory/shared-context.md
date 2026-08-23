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
  | { ok: true }
  | { ok: false; error: string };

/** Route state for React Router navigation */
export type RouteState = {
  "/onboarding": { step?: number };
  "/": undefined;
  "/missions": undefined;
  "/badges": undefined;
  "/simulate": undefined;
  "/simulate/resu
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
  lib/
    contract.ts
    storage.ts
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
- contract.ts: export type RouteState = 'onboarding' | 'home' | 'missions' | 'badges' | 'simulate' | 'simulateResult' | 'report'; export type User =; export type Mission =; export type Activity =; export type Badge =; export type SimulationInput =; export type SimulationResult =; export type getItemFn = <T>(key: string) => T | null
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- common.tsx: SectionHeader, EmptyState, DisclaimerText, LoadingBlock
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0017: 라우팅 트리 + 부트 게이트 + FloatingTabBar 배선 (files: src/App.tsx)