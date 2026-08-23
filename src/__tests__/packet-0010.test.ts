import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { SaveResult } from "@/lib/types";

mockAll();

// ── useAppData mock (page reads/writes profile + flags through this hook) ──
const mockActions = vi.hoisted(() => ({
  saveProfileAndSnapshot: vi.fn(async (): Promise<SaveResult> => ({ ok: true })),
  ackDisclaimer: vi.fn(async (): Promise<SaveResult> => ({ ok: true })),
  completeOnboarding: vi.fn(async (): Promise<SaveResult> => ({ ok: true })),
}));

const mockFlags = vi.hoisted(() => ({
  onboardingDone: false,
  disclaimerAckedAt: null as string | null,
}));

vi.mock("@/hooks/useAppData", () => ({
  useAppData: () => ({
    loading: false,
    profile: null,
    scoreHistory: [],
    missionLogs: {},
    streak: { current: 0, longest: 0, lastCompletedDate: null, totalCompletedMissions: 0 },
    badges: { unlockedBadgeIds: [], unlockedAt: {} },
    flags: mockFlags,
    lastSimulation: null,
    actions: {
      toggleMission: vi.fn(),
      saveProfileAndSnapshot: mockActions.saveProfileAndSnapshot,
      ackDisclaimer: mockActions.ackDisclaimer,
      completeOnboarding: mockActions.completeOnboarding,
      recordSimulation: vi.fn(),
    },
  }),
}));

import Onboarding from "@/pages/Onboarding";

// ── Test data ──
const VALID = { score: "750", birthYear: "1990", cardUsageRatio: "30", loanCount: "2" };

function fillValidForm() {
  fireEvent.change(screen.getByTestId("score-input"), { target: { value: VALID.score } });
  fireEvent.change(screen.getByTestId("birthYear-input"), { target: { value: VALID.birthYear } });
  fireEvent.change(screen.getByTestId("cardUsageRatio-input"), { target: { value: VALID.cardUsageRatio } });
  fireEvent.change(screen.getByTestId("loanCount-input"), { target: { value: VALID.loanCount } });
}

function getCta() {
  return screen.getByRole("button", { name: /저장/ });
}

describe("S1 온보딩 화면 /onboarding", () => {
  beforeEach(() => {
    mockActions.saveProfileAndSnapshot.mockReset().mockResolvedValue({ ok: true });
    mockActions.ackDisclaimer.mockReset().mockResolvedValue({ ok: true });
    mockActions.completeOnboarding.mockReset().mockResolvedValue({ ok: true });
    mockFlags.onboardingDone = false;
    mockFlags.disclaimerAckedAt = "2026-08-01T00:00:00.000Z"; // acked by default; AC-4 tests override
    mockNavigate.mockReset();
  });

  it("AC-1[P0]: score에 1200 입력 시 hasError=true, help가 정확한 문구로 바뀌고 CTA가 disabled다", () => {
    renderWithRouter(React.createElement(Onboarding));

    fireEvent.change(screen.getByTestId("score-input"), { target: { value: "1200" } });

    expect(screen.getByText("350~1000 사이 숫자로 입력해요")).toBeInTheDocument();
    expect(getCta()).toBeDisabled();
  });

  it("AC-2[P0]: 4개 필드가 모두 유효하면 CTA가 활성화되고, 탭 시 haptic → 저장 → onboardingDone 기록 → navigate 순으로 1회씩 실행된다", async () => {
    renderWithRouter(React.createElement(Onboarding));

    fillValidForm();
    const cta = getCta();
    expect(cta).not.toBeDisabled();

    fireEvent.click(cta);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));

    const { generateHapticFeedback } = await import("@apps-in-toss/web-framework");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockActions.saveProfileAndSnapshot).toHaveBeenCalledTimes(1);
    expect(mockActions.saveProfileAndSnapshot).toHaveBeenCalledWith({
      score: 750,
      birthYear: 1990,
      cardUsageRatio: 30,
      loanCount: 2,
    });
    expect(mockActions.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-3[P0]: 저장 실패(ok:false) 시 하단 Toast에 안내 문구가 뜨고 화면 전환이 일어나지 않는다", async () => {
    mockActions.saveProfileAndSnapshot.mockResolvedValue({
      ok: false,
      error: "저장 공간이 부족해요. 오래된 기록을 정리했어요",
    });

    renderWithRouter(React.createElement(Onboarding));
    fillValidForm();
    fireEvent.click(getCta());

    const toast = await screen.findByText("저장 공간이 부족해요. 오래된 기록을 정리했어요");
    expect(toast.getAttribute("data-position")).toBe("bottom");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P0]-a: disclaimerAckedAt이 null이면 AlertDialog가 열리고, '확인' 탭 시 ackDisclaimer가 1회 호출된다", async () => {
    mockFlags.disclaimerAckedAt = null;

    renderWithRouter(React.createElement(Onboarding));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(mockActions.ackDisclaimer).toHaveBeenCalledTimes(1));
  });

  it("AC-4-b: disclaimerAckedAt이 이미 기록되어 있으면 재진입 시 AlertDialog가 열리지 않는다", () => {
    mockFlags.disclaimerAckedAt = "2026-08-01T00:00:00.000Z";

    renderWithRouter(React.createElement(Onboarding));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-5[P0]: CTA 1회 클릭 후 저장 완료 전 재클릭이 무시되어 saveProfileAndSnapshot이 1회만 호출된다", async () => {
    let resolveSave!: (r: SaveResult) => void;
    mockActions.saveProfileAndSnapshot.mockImplementation(
      () => new Promise<SaveResult>((resolve) => { resolveSave = resolve; })
    );

    renderWithRouter(React.createElement(Onboarding));
    fillValidForm();
    const cta = getCta();

    fireEvent.click(cta);
    fireEvent.click(cta);
    fireEvent.click(cta);

    expect(mockActions.saveProfileAndSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave({ ok: true });
      await Promise.resolve();
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  });
});
