import type { BadgeDefinition, BadgeState } from "@/lib/types";

/** Context signals badge eligibility is evaluated against. */
export interface BadgeEvalContext {
  streak: number;
  /** 시뮬레이션 결과를 1회 이상 조회했는지 여부 */
  simulated?: boolean;
}

interface BadgeCatalogEntry extends BadgeDefinition {
  isEligible: (ctx: BadgeEvalContext) => boolean;
}

const BADGE_CATALOG: BadgeCatalogEntry[] = [
  {
    id: "b_streak3",
    name: "사흘의 힘",
    description: "3일 연속 미션을 완료했어요",
    icon: "🔥",
    isEligible: (ctx) => ctx.streak >= 3,
  },
  {
    id: "b_simulator",
    name: "미래 예측가",
    description: "점수 시뮬레이션 결과를 확인했어요",
    icon: "🔮",
    isEligible: (ctx) => ctx.simulated === true,
  },
];

export function evaluateBadges(
  prev: BadgeState,
  ctx: BadgeEvalContext,
  nowIso: string
): { newlyUnlocked: BadgeDefinition[]; next: BadgeState } {
  const unlockedBadgeIds = [...prev.unlockedBadgeIds];
  const unlockedAt = { ...prev.unlockedAt };
  const newlyUnlocked: BadgeDefinition[] = [];

  for (const { isEligible, ...badge } of BADGE_CATALOG) {
    if (unlockedBadgeIds.includes(badge.id) || !isEligible(ctx)) continue;
    unlockedBadgeIds.push(badge.id);
    unlockedAt[badge.id] = nowIso;
    newlyUnlocked.push(badge);
  }

  return { newlyUnlocked, next: { unlockedBadgeIds, unlockedAt } };
}
