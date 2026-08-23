import { describe, it, expect } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import Report from "@/pages/Report";

mockAll();

/* Packet 0019: S7 또래 비교 리포트 /report */

function seedProfile(overrides: Partial<Record<string, unknown>> = {}) {
  localStorage.setItem(
    "scoreclimb.profile.v1",
    JSON.stringify({
      score: 850,
      birthYear: 1996,
      cardUsageRatio: 35,
      loanCount: 1,
      updatedAt: "2026-08-01T00:00:00.000Z",
      ...overrides,
    })
  );
}

describe("Report page", () => {
  it("AC-1: shows the peer band and its benchmark values", () => {
    seedProfile();

    renderWithRouter(React.createElement(Report));

    expect(screen.getByText(/30-34 또래와 비교하면/)).toBeInTheDocument();
    expect(screen.getByText(/또래 평균 830점/)).toBeInTheDocument();
    expect(screen.getByText(/또래 평균 34%/)).toBeInTheDocument();
  });

  it("AC-2: shows signed score diff and branches the verdict copy by scoreVerdict", () => {
    seedProfile();

    renderWithRouter(React.createElement(Report));

    // score 850 vs band 30-34 avg 830 → +20, verdict=above
    expect(screen.getByText(/\+20점/)).toBeInTheDocument();
    expect(screen.getByText(/또래보다 20점 높아요/)).toBeInTheDocument();
  });

  it("AC-2b: renders 'below' verdict copy with a negative signed diff", () => {
    seedProfile({ score: 700 });

    renderWithRouter(React.createElement(Report));

    // score 700 vs band 30-34 avg 830 → -130, verdict=below
    expect(screen.getByText(/-130점/)).toBeInTheDocument();
    expect(screen.getByText(/또래보다 130점 낮아요/)).toBeInTheDocument();
  });

  it("AC-3: always displays the peer-average reference disclaimer", () => {
    seedProfile();

    renderWithRouter(React.createElement(Report));

    expect(
      screen.getByText(/또래 평균은 앱 자체 산정 참고값이에요\. 공식 신용평가사 통계가 아니에요/)
    ).toBeInTheDocument();
  });

  it("AC-4: renders EmptyState with a CTA to /onboarding when no profile exists", () => {
    renderWithRouter(React.createElement(Report));

    expect(screen.getByTestId("report-empty")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /현황 입력하러 가기/ });
    cta.click();

    expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
  });

  it("AC-5: places the AdSlot without gating the comparison content", () => {
    seedProfile();

    const { container } = renderWithRouter(React.createElement(Report));

    expect(screen.getByTestId("report-comparison-card")).toBeInTheDocument();
    expect(container.querySelector(".ad-slot")).toBeInTheDocument();
  });
});
