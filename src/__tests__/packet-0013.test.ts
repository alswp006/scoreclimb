import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { BADGE_DEFINITIONS, STORAGE_KEYS, DEFAULT_BADGES, DEFAULT_STREAK } from "@/lib/constants";
import type { BadgeState, StreakState } from "@/lib/types";

// TDS + @apps-in-toss/web-framework + react-router-dom mocks.
// @/hooks/useAppData is intentionally NOT mocked — this page reads streak/badges
// via useAppData's real (synchronous) localStorage persistence, which already exists.
mockAll();

import Badges from "@/pages/Badges";

function seedBadges(state: BadgeState) {
  seedLocalStorage({ [STORAGE_KEYS.badges]: state });
}

function seedStreak(state: StreakState) {
  seedLocalStorage({ [STORAGE_KEYS.streak]: state });
}

function getCardByBadgeId(badgeId: string): HTMLElement {
  const cards = screen.getAllByTestId("badge-card");
  const card = cards.find((c) => c.getAttribute("data-badge-id") === badgeId);
  if (!card) throw new Error(`card not found for ${badgeId}`);
  return card;
}

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe("S4 스트릭 & 배지 화면 /badges", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1: BADGE_DEFINITIONS 6종이 모두 렌더되고, 획득한 배지는 획득 표시 + unlockedAt 날짜(YYYY.MM.DD)가 보인다", () => {
    seedBadges({
      unlockedBadgeIds: ["b_first_mission", "b_streak_3"],
      unlockedAt: {
        b_first_mission: "2026-08-01T12:00:00.000Z",
        b_streak_3: "2026-08-20T12:00:00.000Z",
      },
    });
    seedStreak(DEFAULT_STREAK);

    renderWithRouter(React.createElement(Badges));

    const cards = screen.getAllByTestId("badge-card");
    expect(cards).toHaveLength(6);
    expect(cards.map((c) => c.getAttribute("data-badge-id"))).toEqual(
      BADGE_DEFINITIONS.map((b) => b.id)
    );

    const firstMissionCard = getCardByBadgeId("b_first_mission");
    expect(firstMissionCard.getAttribute("data-unlocked")).toBe("true");
    expect(firstMissionCard.textContent).toContain("첫 걸음");
    expect(firstMissionCard.textContent).toContain("2026.08.01");

    const streak3Card = getCardByBadgeId("b_streak_3");
    expect(streak3Card.getAttribute("data-unlocked")).toBe("true");
    expect(streak3Card.textContent).toContain("2026.08.20");
  });

  it("AC-2: 미획득 배지에는 condition 기반 문구가 표시된다 (예: '3일 연속 달성하면 열려요')", () => {
    seedBadges(DEFAULT_BADGES);
    seedStreak(DEFAULT_STREAK);

    renderWithRouter(React.createElement(Badges));

    const streak3Card = getCardByBadgeId("b_streak_3");
    expect(streak3Card.getAttribute("data-unlocked")).toBe("false");
    expect(streak3Card.textContent).toContain("3일 연속 달성하면 열려요");

    const firstMissionCard = getCardByBadgeId("b_first_mission");
    expect(firstMissionCard.getAttribute("data-unlocked")).toBe("false");
    expect(firstMissionCard.textContent).not.toBe("");
  });

  it("AC-3: 상단 요약에 streak.current, streak.longest, streak.totalCompletedMissions 3개 값이 모두 표시된다", () => {
    seedBadges(DEFAULT_BADGES);
    seedStreak({
      current: 5,
      longest: 9,
      lastCompletedDate: "2026-08-23",
      totalCompletedMissions: 42,
    });

    renderWithRouter(React.createElement(Badges));

    const summary = screen.getByTestId("badge-summary");
    expect(summary.textContent).toContain("5");
    expect(summary.textContent).toContain("9");
    expect(summary.textContent).toContain("42");
  });

  it("AC-4: 획득 배지가 0개일 때 EmptyState 대신 6개 잠금 카드가 렌더되고 예외가 발생하지 않는다", () => {
    seedBadges(DEFAULT_BADGES);
    seedStreak(DEFAULT_STREAK);

    expect(() => renderWithRouter(React.createElement(Badges))).not.toThrow();

    const cards = screen.getAllByTestId("badge-card");
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.getAttribute("data-unlocked") === "false")).toBe(true);
    expect(screen.queryByTestId("badge-empty")).toBeNull();
  });

  it("AC-5: 배지 카드에 이모지가 0건이고 Asset.ContentIcon(data-content-icon)을 6개 모두 사용한다", () => {
    seedBadges(DEFAULT_BADGES);
    seedStreak(DEFAULT_STREAK);

    const { container } = renderWithRouter(React.createElement(Badges));

    expect(EMOJI_REGEX.test(container.textContent ?? "")).toBe(false);

    const icons = container.querySelectorAll("[data-content-icon]");
    expect(icons.length).toBe(6);
  });
});
