import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { DEFAULT_BADGES, DEFAULT_FLAGS } from "@/lib/constants";
import { simulate } from "@/lib/simulate";
import type { CreditProfile } from "@/lib/types";

// TDS + @apps-in-toss/web-framework + react-router-dom mocks.
mockAll();

const { useAppData } = vi.hoisted(() => ({ useAppData: vi.fn() }));
vi.mock("@/hooks/useAppData", () => ({ useAppData }));

import Simulate from "@/pages/Simulate";

const PROFILE: CreditProfile = {
  score: 750,
  birthYear: 1990,
  cardUsageRatio: 30,
  loanCount: 2,
  updatedAt: "2026-08-20T00:00:00.000Z",
};

function makeUseAppData(profile: CreditProfile | null = PROFILE) {
  return function useAppDataMock() {
    return {
      loading: false,
      profile,
      scoreHistory: [],
      missionLogs: {},
      streak: { current: 0, longest: 0, lastCompletedDate: null, totalCompletedMissions: 0 },
      badges: DEFAULT_BADGES,
      flags: DEFAULT_FLAGS,
      lastSimulation: null,
      actions: {
        toggleMission: vi.fn(),
        saveProfileAndSnapshot: vi.fn(),
        ackDisclaimer: vi.fn(),
        completeOnboarding: vi.fn(),
        recordSimulation: vi.fn(),
      },
    };
  };
}

function fillValid() {
  fireEvent.change(screen.getByTestId("onTimePaymentMonths-input"), { target: { value: "12" } });
  fireEvent.change(screen.getByTestId("newLoanCount-input"), { target: { value: "1" } });
}

describe("S5 시뮬레이션 입력 /simulate", () => {
  beforeEach(() => {
    useAppData.mockReset();
    useAppData.mockImplementation(makeUseAppData());
  });

  it("AC-1: 프로필이 있으면 현재점수·카드 사용률 필드가 프로필 값으로 프리필된다", () => {
    renderWithRouter(React.createElement(Simulate));

    expect(screen.getByTestId("currentScore-input")).toHaveValue(750);
    expect(screen.getByTestId("cardUsageRatio-input")).toHaveValue(30);
  });

  it("AC-2[P0]-a: onTimePaymentMonths=30(범위 밖) 입력 시 hasError=true이고 CTA가 disabled된다", () => {
    renderWithRouter(React.createElement(Simulate));
    fillValid();

    fireEvent.change(screen.getByTestId("onTimePaymentMonths-input"), { target: { value: "30" } });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("simulate-cta")).toBeDisabled();
  });

  it("AC-2[P0]-b: 모든 필드가 유효 범위 안이면 CTA가 활성화된다", () => {
    renderWithRouter(React.createElement(Simulate));

    fillValid();

    expect(screen.getByTestId("simulate-cta")).not.toBeDisabled();
  });

  it("AC-3[P0]-a: CTA 탭 시 success 햅틱 후 /simulate/result로 RouteState 모양의 state와 함께 1회 navigate된다", async () => {
    renderWithRouter(React.createElement(Simulate));
    fillValid();

    fireEvent.click(screen.getByTestId("simulate-cta"));

    const { generateHapticFeedback } = await import("@apps-in-toss/web-framework");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/simulate/result");

    const expectedInput = {
      currentScore: 750,
      cardUsageRatio: 30,
      onTimePaymentMonths: 12,
      newLoanCount: 1,
    };
    const expected = simulate(expectedInput);

    expect(options.state.result.input).toEqual(expectedInput);
    expect(options.state.result.predictedScore).toBe(expected.predictedScore);
    expect(options.state.result.delta).toBe(expected.delta);
    expect(options.state.result.factors).toEqual(expected.factors);
    expect(options.state.result.monthlyProjection).toEqual(expected.monthlyProjection);
  });

  it("AC-3[P0]-b: 입력이 유효하지 않으면 CTA를 눌러도 navigate가 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Simulate));
    // onTimePaymentMonths/newLoanCount 미입력 상태(빈 값) → 유효하지 않음

    fireEvent.click(screen.getByTestId("simulate-cta"));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4: 화면 하단에 참고값 고지 문구가 st13/tertiary로 상시 노출된다", () => {
    renderWithRouter(React.createElement(Simulate));

    const notice = screen.getByText("실제 평가 결과와 다를 수 있어요", { exact: false });
    expect(notice.getAttribute("data-typography")).toBe("st13");
    expect(notice.getAttribute("color")).toBe("tertiary");
  });

  it("AC-5: 고정 CTA에 paddingBottom: calc(16px + env(safe-area-inset-bottom))가 적용된다", () => {
    renderWithRouter(React.createElement(Simulate));

    const cta = screen.getByTestId("simulate-cta");
    expect(cta.style.paddingBottom).toBe("calc(16px + env(safe-area-inset-bottom))");
  });
});
