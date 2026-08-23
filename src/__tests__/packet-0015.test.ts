import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { simulate } from "@/lib/simulate";
import { STORAGE_KEYS } from "@/lib/constants";
import type { SimulationResult } from "@/lib/types";

// TDS + @apps-in-toss/web-framework + react-router-dom mocks.
mockTds();
mockAppsInToss();
mockRouter();

// Custom TossRewardAd mock — captures the slotId prop (unlike the shared
// helper's mockTossRewardAd, which discards props) and renders children
// synchronously (ad "watched") so gated content is inspectable.
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ slotId, children }: { slotId: string; children: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "reward-ad-mock", "data-slot-id": slotId },
      children,
    ),
}));

import SimulateResult from "@/pages/SimulateResult";

const RESULT: SimulationResult = simulate(
  { currentScore: 820, cardUsageRatio: 25, onTimePaymentMonths: 6, newLoanCount: 1 },
  { current: 10 },
);

function renderResult(state?: { result: SimulationResult }) {
  return renderWithRouter(React.createElement(SimulateResult), {
    initialEntries: [{ pathname: "/simulate/result", state }],
  });
}

describe("S6 시뮬레이션 결과 + 보상형 광고 게이트 /simulate/result", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-1[P0]: state와 lastSimulation이 모두 없으면 흰 화면 대신 EmptyState와 이동 버튼이 렌더되고 탭 시 /simulate로 이동한다", () => {
    renderWithRouter(React.createElement(SimulateResult), {
      initialEntries: ["/simulate/result"],
    });

    // 흰 화면이 아님 — 상단 네비게이션과 EmptyState가 실제로 그려짐
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    const empty = screen.getByTestId("sim-empty");
    expect(empty).toBeInTheDocument();

    const cta = within(empty).getByRole("button", { name: /시뮬레이션/ });
    fireEvent.click(cta);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.calls[0][0]).toBe("/simulate");

    // 결과 없는 화면엔 광고 게이트도 없음
    expect(screen.queryByTestId("reward-ad-mock")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 결과 본문이 TossRewardAd(slotId=VITE_TOSS_AD_SLOT_ID)로 감싸져 있고 게이트 안에 최종 결과(sim-result)가 렌더된다", () => {
    vi.stubEnv("VITE_TOSS_AD_SLOT_ID", "sim-result-unlock");

    renderResult({ result: RESULT });

    const gate = screen.getByTestId("reward-ad-mock");
    expect(gate).toBeInTheDocument();
    expect(gate.getAttribute("data-slot-id")).toBe("sim-result-unlock");
    expect(within(gate).getByTestId("sim-result")).toBeInTheDocument();
  });

  it("AC-3[P0]: predictedScore·부호 포함 delta·6개월 추이 6개 값·요인 4개(label/impact)가 모두 렌더된다", () => {
    // 결정론적 순수 함수(simulate)로 만든 실제 결과값 기준 — 하드코딩된 기대값 아님
    expect(RESULT.monthlyProjection).toHaveLength(6);
    expect(RESULT.factors).toHaveLength(4);
    expect(RESULT.delta).toBe(RESULT.predictedScore - RESULT.input.currentScore);

    renderResult({ result: RESULT });

    expect(screen.getByText(new RegExp(`\\b${RESULT.predictedScore}\\b`))).toBeInTheDocument();
    const deltaSign = RESULT.delta >= 0 ? "+" : "-";
    expect(
      screen.getByText(new RegExp(`\\${deltaSign}${Math.abs(RESULT.delta)}\\b`)),
    ).toBeInTheDocument();

    RESULT.monthlyProjection.forEach((v) => {
      expect(screen.getAllByText(new RegExp(`\\b${v}\\b`)).length).toBeGreaterThan(0);
    });

    const factorCards = screen.getAllByTestId("factor-card");
    expect(factorCards).toHaveLength(4);
    RESULT.factors.forEach((f, i) => {
      const card = factorCards[i];
      expect(within(card).getByText(f.label)).toBeInTheDocument();
      const sign = f.impact > 0 ? "+" : f.impact < 0 ? "-" : "";
      const magnitude = Math.abs(f.impact);
      expect(within(card).getByText(new RegExp(`${sign}${magnitude}\\b`))).toBeInTheDocument();
    });
  });

  it("AC-4[P0]: 진입 시 결과가 scoreclimb.lastSimulation.v1에 정확히 1회 저장되고 b_simulator 배지 평가가 1회 수행된다", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    renderResult({ result: RESULT });

    const lastSimWrites = setItemSpy.mock.calls.filter(([key]) => key === STORAGE_KEYS.lastSimulation);
    expect(lastSimWrites).toHaveLength(1);
    const savedResult = JSON.parse(lastSimWrites[0][1] as string) as SimulationResult;
    expect(savedResult.predictedScore).toBe(RESULT.predictedScore);
    expect(savedResult.delta).toBe(RESULT.delta);

    const badgeWrites = setItemSpy.mock.calls.filter(([key]) => key === STORAGE_KEYS.badges);
    expect(badgeWrites).toHaveLength(1);
    const savedBadges = JSON.parse(badgeWrites[0][1] as string) as { unlockedBadgeIds: string[] };
    expect(savedBadges.unlockedBadgeIds).toContain("b_simulator");

    setItemSpy.mockRestore();
  });

  it("AC-5[P0]: '실제 평가 결과와 다를 수 있어요' 참고값 고지가 결과 하단에 표시되고 AI 라벨/고지 문구는 0건이다", () => {
    renderResult({ result: RESULT });

    expect(screen.getByText(/실제 평가 결과와 다를 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/AI/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
