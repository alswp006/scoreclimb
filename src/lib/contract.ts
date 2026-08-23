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
export type getItemFn = <T>(key: string): T | null;

/** 스토리지 쓰기 (JSON stringify 포함) (구현: 패킷 0003) */
export type setItemFn = <T>(key: string, value: T): void;

/** 날짜 계산 유틸 (구현: 패킷 0003) */
export type addDaysFn = (date: Date, days: number): Date;

/** 날짜 비교 유틸 (구현: 패킷 0003) */
export type isSameDayFn = (d1: Date, d2: Date): boolean;

/** 사용자 조회 (구현: 패킷 0004) */
export type getUserDataFn = (): User | null;

/** 사용자 저장 (구현: 패킷 0004) */
export type setUserDataFn = (user: User): void;

/** 미션 목록 조회 (구현: 패킷 0004) */
export type getMissionsFn = (): Mission[];

/** 미션 목록 저장 (구현: 패킷 0004) */
export type saveMissionsFn = (missions: Mission[]): void;

/** 스트릭 계산 순수 함수 (구현: 패킷 0005) */
export type calculateStreakFn = (activities: Activity[], today: Date): { current: number; longest: number };

/** 달성 가능한 배지 목록 (구현: 패킷 0005) */
export type getBadgeCandidatesFn = (activities: Activity[], currentStreak: number): Badge[];

/** 자산 시뮬레이션 엔진 (구현: 패킷 0006) */
export type simulateFn = (input: SimulationInput): SimulationResult;

/** 앱 상태 훅 (모든 페이지의 데이터 출입구) (구현: 패킷 0008) */
export type useAppDataFn = (): { user: User | null; missions: Mission[]; activities: Activity[]; updateMission: (id: string, status: 'completed') => Promise<void> };
