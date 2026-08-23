import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS } from "@/lib/constants";
import { getBand, getBenchmark } from "@/lib/benchmark";
import type { CreditProfile, ScoreSnapshot } from "@/lib/types";

// TDS + @apps-in-toss/web-framework + react-router-dom mocks.
// @/hooks/useAppData is intentionally NOT mocked — this page reads profile/scoreHistory
// via useAppData's real (synchronous) localStorage persistence, which already exists.
mockAll();

import Report from "@/pages/Report";

const TODAY_KEY = "2026-08-24";

function seedProfile(profile: CreditProfile) {
  seedLocalStorage({ [STORAGE_KEYS.profile]: profile });
}

function seedHistory(history: ScoreSnapshot[]) {
  seedLocalStorage({ [STORAGE_KEYS.scoreHistory]: history });
}

function makeProfile(overrides: Partial<CreditProfile> = {}): CreditProfile {
  return {
    score: 800,
    birthYear: 2000, // as of 2026 → age 26 → band "25-29"
    cardUsageRatio: 35,
    loanCount: 1,
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("S7 또래 비교 리포트 /report", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1: birthYear 2000(2026년 기준 26세)이면 band '25-29'와 PEER_BENCHMARKS 기준 avgScore 780, avgCardUsageRatio 38이 화면에 표시된다", () => {
    const profile = makeProfile({ birthYear: 2000, score: 800, cardUsageRatio: 35 });
    seedProfile(profile);
    seedHistory([{ date: TODAY_KEY, score: 800 }]);

    // Sanity: assert against the actual domain functions (not hardcoded guesses)
    const band = getBand(profile.birthYear, TODAY_KEY);
    const benchmark = getBenchmark(band);
    expect(band).toBe("25-29");
    expect(benchmark.avgScore).toBe(780);
    expect(benchmark.avgCardUsageRatio).toBe(38);

    const { container } = renderWithRouter(React.createElement(Report));

    expect(container.textContent).toContain("25-29");
    expect(container.textContent).toContain("780");
    expect(container.textContent).toContain("38");
  });

  it("AC-2: 내 점수와 또래 평균 차이가 부호 포함으로 표시되고 above/similar/below 3종 문구로 분기된다", () => {
    // above: 830 - 780 = +50
    const aboveProfile = makeProfile({ score: 830 });
    seedProfile(aboveProfile);
    seedHistory([{ date: TODAY_KEY, score: 830 }]);
    const above = renderWithRouter(React.createElement(Report));
    const aboveNode = screen.getByTestId("report-score-diff");
    expect(aboveNode.textContent).toContain("+50");
    expect(aboveNode.getAttribute("data-verdict")).toBe("above");
    above.unmount();
    localStorage.clear();

    // below: 700 - 780 = -80
    const belowProfile = makeProfile({ score: 700 });
    seedProfile(belowProfile);
    seedHistory([{ date: TODAY_KEY, score: 700 }]);
    const below = renderWithRouter(React.createElement(Report));
    const belowNode = screen.getByTestId("report-score-diff");
    expect(belowNode.textContent).toContain("-80");
    expect(belowNode.getAttribute("data-verdict")).toBe("below");
    below.unmount();
    localStorage.clear();

    // similar: 785 - 780 = +5 (within SIMILAR_THRESHOLD of 10)
    const similarProfile = makeProfile({ score: 785 });
    seedProfile(similarProfile);
    seedHistory([{ date: TODAY_KEY, score: 785 }]);
    const similar = renderWithRouter(React.createElement(Report));
    const similarNode = screen.getByTestId("report-score-diff");
    expect(similarNode.getAttribute("data-verdict")).toBe("similar");
    expect(similarNode.textContent).toContain("+5");
  });

  it("AC-3: '또래 평균은 앱 자체 산정 참고값'이라는 고지 문구가 프로필 유무와 무관하게 항상 표시된다", () => {
    seedProfile(makeProfile());
    seedHistory([{ date: TODAY_KEY, score: 800 }]);
    const withProfile = renderWithRouter(React.createElement(Report));
    expect(withProfile.container.textContent).toMatch(/또래 평균.*참고값/);
    expect(withProfile.container.textContent).toMatch(/공식.*(신용평가사)?.*아니/);
    withProfile.unmount();
    localStorage.clear();

    const withoutProfile = renderWithRouter(React.createElement(Report));
    expect(withoutProfile.container.textContent).toMatch(/또래 평균.*참고값/);
  });

  it("AC-4: 프로필이 없으면 EmptyState와 '현황 입력하러 가기' 버튼이 렌더되고 탭 시 /onboarding으로 이동한다", () => {
    // no seedProfile — repository.loadProfile() returns null
    renderWithRouter(React.createElement(Report));

    expect(screen.getByTestId("report-empty")).toBeInTheDocument();
    const enterButton = screen.getByRole("button", { name: /현황 입력하러 가기/ });
    expect(enterButton).toBeInTheDocument();

    enterButton.click();
    expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
  });

  it("AC-5: 프로필이 있으면 AdSlot이 비교 카드 이후(본문을 가리지 않는 위치)에 배치된다", () => {
    seedProfile(makeProfile());
    seedHistory([{ date: TODAY_KEY, score: 800 }]);

    const { container } = renderWithRouter(React.createElement(Report));

    const comparisonCard = screen.getByTestId("report-comparison-card");
    const adSlot = container.querySelector("[data-ad-group-id]");
    expect(adSlot).not.toBeNull();

    // AdSlot must not be nested inside the comparison card (would visually cover content)
    expect(within(comparisonCard).queryByTestId(adSlot!.getAttribute("data-testid") ?? "__none__")).toBeNull();
    expect(comparisonCard.contains(adSlot)).toBe(false);

    // Position check: comparison card content precedes the ad slot in document order
    const position = comparisonCard.compareDocumentPosition(adSlot!);
    expect((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
  });
});
