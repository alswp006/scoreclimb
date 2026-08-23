import type {
  SimulationInput,
  SimulationResult,
  SimulationFactor,
  FactorDirection,
} from "@/lib/types";

const SCORE_MIN = 350;
const SCORE_MAX = 1000;
const PROJECTION_MONTHS = 6;

function clampScore(score: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(score)));
}

function directionOf(impact: number): FactorDirection {
  if (impact > 0) return "up";
  if (impact < 0) return "down";
  return "flat";
}

function makeFactor(label: string, impact: number): SimulationFactor {
  return { label, impact, direction: directionOf(impact) };
}

/**
 * 최근 스트릭(연속 활동 일수) 컨텍스트 — 선택 인자.
 * 미제공 시 보너스 없음(current: 0)으로 취급한다.
 */
export interface SimulationStreakContext {
  current: number;
}

/**
 * 신용점수 시뮬레이션 — 결정론적 순수 함수 (spec 고정 산식).
 * 동일 입력은 항상 동일한 predictedScore/factors/monthlyProjection을 낸다(createdAt 제외).
 */
export function simulate(
  input: SimulationInput,
  streak?: SimulationStreakContext
): SimulationResult {
  const { currentScore, cardUsageRatio, onTimePaymentMonths, newLoanCount } = input;
  const streakCurrent = streak?.current ?? 0;

  const usageDelta =
    cardUsageRatio <= 30 ? 18 : cardUsageRatio <= 50 ? 6 : cardUsageRatio <= 70 ? -10 : -25;
  const paymentDelta = Math.min(onTimePaymentMonths, 12) * 3;
  const loanDelta = newLoanCount * -12;
  const streakBonus = Math.round(Math.min(Math.max(streakCurrent, 0), 30) * 0.5);

  const factors: SimulationFactor[] = [
    makeFactor("카드 사용률", usageDelta),
    makeFactor("연체 없는 기간", paymentDelta),
    makeFactor("신규 대출", loanDelta),
    makeFactor("미션 스트릭", streakBonus),
  ];

  const predictedScore = clampScore(
    currentScore + usageDelta + paymentDelta + loanDelta + streakBonus
  );
  const delta = predictedScore - currentScore;

  const monthlyProjection: number[] = Array.from({ length: PROJECTION_MONTHS }, (_, i) =>
    clampScore(currentScore + Math.round((delta * (i + 1)) / PROJECTION_MONTHS))
  );

  return {
    input,
    predictedScore,
    delta,
    monthlyProjection,
    factors,
    createdAt: new Date().toISOString(),
  };
}
