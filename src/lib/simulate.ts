import type {
  SimulationInput,
  SimulationResult,
  SimulationFactor,
  FactorDirection,
} from "@/lib/types";

const SCORE_MIN = 350;
const SCORE_MAX = 1000;
const SCORE_MID = (SCORE_MIN + SCORE_MAX) / 2;
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
 * 신용점수 시뮬레이션 — 결정론적 순수 함수.
 * 동일 입력은 항상 동일한 predictedScore/factors/monthlyProjection을 낸다(createdAt 제외).
 */
export function simulate(
  input: SimulationInput,
  streak?: SimulationStreakContext
): SimulationResult {
  const { currentScore, cardUsageRatio, onTimePaymentMonths, newLoanCount } = input;
  const streakCurrent = streak?.current ?? 0;

  const cardUsageImpact = Math.round((30 - cardUsageRatio) * 0.6);
  const paymentHistoryImpact = Math.round(onTimePaymentMonths * 1.2);
  const newLoanImpact = newLoanCount * -8;
  const currentScoreImpact = Math.round((SCORE_MID - currentScore) * 0.05);
  const streakBonus = Math.round(Math.min(Math.max(streakCurrent, 0), 30) * 0.5);

  const factors: SimulationFactor[] = [
    makeFactor("카드 사용률", cardUsageImpact),
    makeFactor("정시 납부 이력", paymentHistoryImpact),
    makeFactor("신규 대출", newLoanImpact),
    makeFactor("현재 신용점수", currentScoreImpact),
  ];

  const totalImpact =
    cardUsageImpact + paymentHistoryImpact + newLoanImpact + currentScoreImpact + streakBonus;

  const predictedScore = clampScore(currentScore + totalImpact);
  const delta = predictedScore - currentScore;

  const monthlyProjection: number[] = Array.from({ length: PROJECTION_MONTHS }, (_, i) => {
    const ratio = (i + 1) / PROJECTION_MONTHS;
    return clampScore(currentScore + (predictedScore - currentScore) * ratio);
  });

  return {
    input,
    predictedScore,
    delta,
    monthlyProjection,
    factors,
    createdAt: new Date().toISOString(),
  };
}
