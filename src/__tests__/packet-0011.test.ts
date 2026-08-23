import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { MISSION_DEFINITIONS, DEFAULT_BADGES, DEFAULT_FLAGS } from "@/lib/constants";
import { todayKey } from "@/lib/date";
import type { CreditProfile, MissionLogMap, StreakState } from "@/lib/types";

mockAll();

// ── useAppData mock (page reads profile/missionLogs/streak + calls actions.toggleMission) ──
// Implemented as a real stateful hook (React.useState) so that calling toggleMission
// from a click handler causes an actual re-render, mirroring how the real hook
// (src/hooks/useAppData.ts) updates missionLogs optimistically. See packet-0010's
// simpler (static) useAppData mock for contrast — this packet's AC-2 requires
// "즉시 갱신" after a user interaction, which a static mock cannot exercise.
const { useAppData } = vi.hoisted(() => ({ useAppData: vi.fn() }));
vi.mock("@/hooks/useAppData", () => ({ useAppData }));

import Home from "@/pages/Home";

const PROFILE: CreditProfile = {
  score: 750,
  birthYear: 1990,
  cardUsageRatio: 30,
  loanCount: 2,
  updatedAt: "2026-08-20T00:00:00.000Z",
};

const STREAK: StreakState = {
  current: 5,
  longest: 5,
  lastCompletedDate: todayKey(),
  totalCompletedMissions: 20,
};

function buildMissionLogs(completedIds: string[]): MissionLogMap {
  const date = todayKey();
  const totalPoints = completedIds.reduce((sum, id) => {
    const m = MISSION_DEFINITIONS.find((def) => def.id === id);
    return sum + (m?.points ?? 0);
  }, 0);
  return { [date]: { date, completedMissionIds: completedIds, totalPoints } };
}

function makeUseAppData(overrides: {
  loading?: boolean;
  profile?: CreditProfile | null;
  missionLogs?: MissionLogMap;
  streak?: StreakState;
}) {
  return function useAppDataMock() {
    const [missionLogs, setMissionLogs] = React.useState<MissionLogMap>(
      overrides.missionLogs ?? {}
    );

    const toggleMission = vi.fn((missionId: string) => {
      setMissionLogs((prev) => {
        const date = todayKey();
        const log = prev[date] ?? { date, completedMissionIds: [], totalPoints: 0 };
        const wasCompleted = log.completedMissionIds.includes(missionId);
        const mission = MISSION_DEFINITIONS.find((m) => m.id === missionId);
        const nextIds = wasCompleted
          ? log.completedMissionIds.filter((id) => id !== missionId)
          : [...log.completedMissionIds, missionId];
        const nextPoints = wasCompleted
          ? log.totalPoints - (mission?.points ?? 0)
          : log.totalPoints + (mission?.points ?? 0);
        return {
          ...prev,
          [date]: { date, completedMissionIds: nextIds, totalPoints: nextPoints },
        };
      });
    });

    return {
      loading: overrides.loading ?? false,
      profile: overrides.profile === undefined ? PROFILE : overrides.profile,
      scoreHistory: [],
      missionLogs,
      streak: overrides.streak ?? STREAK,
      badges: DEFAULT_BADGES,
      flags: DEFAULT_FLAGS,
      lastSimulation: null,
      actions: {
        toggleMission,
        saveProfileAndSnapshot: vi.fn(),
        ackDisclaimer: vi.fn(),
        completeOnboarding: vi.fn(),
        recordSimulation: vi.fn(),
      },
    };
  };
}

describe("S2 홈 대시보드 /", () => {
  beforeEach(() => {
    useAppData.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("AC-1[P0]: SummaryHero가 profile.score를 Amount로, caption에 연속 스트릭 문구를 보여준다", () => {
    useAppData.mockImplementation(makeUseAppData({ missionLogs: buildMissionLogs([]) }));

    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-score-amount")).toHaveTextContent("750");
    expect(screen.getByText("5일 연속 미션 달성 중이에요")).toBeInTheDocument();
  });

  it("AC-2[P0]-a: 오늘 미션 요약이 완료 수/획득 점수 형식으로 렌더된다", () => {
    useAppData.mockImplementation(
      makeUseAppData({ missionLogs: buildMissionLogs(["m_card_usage", "m_no_late"]) })
    );

    renderWithRouter(React.createElement(Home));

    expect(screen.getByText("2/6 완료")).toBeInTheDocument();
    expect(screen.getByText("5/12점")).toBeInTheDocument();
  });

  it("AC-2[P0]-b: 추천 미션 토글 시 완료 수·획득 점수가 즉시 갱신된다", () => {
    useAppData.mockImplementation(
      makeUseAppData({ missionLogs: buildMissionLogs(["m_card_usage", "m_no_late"]) })
    );

    renderWithRouter(React.createElement(Home));

    const rows = screen.getAllByTestId("recommend-mission-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("현금서비스 이용 안 하기");

    const chip = within(rows[0]).getByRole("button", { name: "하기" });
    fireEvent.click(chip);

    expect(screen.getByText("3/6 완료")).toBeInTheDocument();
    expect(screen.getByText("7/12점")).toBeInTheDocument();
  });

  it("AC-3: 추천 미션 ListRow가 최대 3개, 완료 항목은 완료/fill Chip, 미완료는 하기/weak Chip으로 구분된다", () => {
    useAppData.mockImplementation(
      makeUseAppData({ missionLogs: buildMissionLogs(["m_card_usage", "m_no_late"]) })
    );

    renderWithRouter(React.createElement(Home));

    const rows = screen.getAllByTestId("recommend-mission-row");
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      const chip = within(row).getByRole("button", { name: "하기" });
      expect(chip.getAttribute("data-variant")).toBe("weak");
    });

    // 토글한 행은 목록에서 사라지지 않고(고정 3개), Chip만 완료/fill로 바뀐다.
    fireEvent.click(within(rows[0]).getByRole("button", { name: "하기" }));

    const updatedRows = screen.getAllByTestId("recommend-mission-row");
    expect(updatedRows).toHaveLength(3);
    const updatedChip = within(updatedRows[0]).getByRole("button", { name: "완료" });
    expect(updatedChip.getAttribute("data-variant")).toBe("fill");
  });

  it("AC-3-b: 미완료 미션이 3개 미만이면 그만큼만 렌더된다", () => {
    useAppData.mockImplementation(
      makeUseAppData({
        missionLogs: buildMissionLogs([
          "m_card_usage",
          "m_no_late",
          "m_auto_pay",
          "m_no_cash_advance",
        ]),
      })
    );

    renderWithRouter(React.createElement(Home));

    const rows = screen.getAllByTestId("recommend-mission-row");
    expect(rows).toHaveLength(2);
    const allText = rows.map((r) => r.textContent).join(" ");
    expect(allText).toContain("대출 상환 계획 점검");
    expect(allText).toContain("신용점수 확인하기");
  });

  it("AC-4[P0]: AdSlot에 env adGroupId가 전달되고 Border 아래 콘텐츠 최하단에 위치한다", async () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "ad-group-scoreclimb-home");
    useAppData.mockImplementation(makeUseAppData({ missionLogs: buildMissionLogs([]) }));

    const { container } = renderWithRouter(React.createElement(Home));

    const hr = container.querySelector("hr");
    const ad = container.querySelector('[data-ad-group-id="ad-group-scoreclimb-home"]');
    expect(hr).not.toBeNull();
    expect(ad).not.toBeNull();
    expect(Boolean(hr!.compareDocumentPosition(ad!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    const { TossAds } = await import("@apps-in-toss/web-framework");
    expect(TossAds.attachBanner).toHaveBeenCalledWith(
      "ad-group-scoreclimb-home",
      expect.any(HTMLElement),
      expect.anything()
    );
  });

  it("AC-5[P0]: loading 상태에서 Hero 자리에 '—' placeholder가 표시되고 흰 화면이 발생하지 않는다", () => {
    useAppData.mockImplementation(makeUseAppData({ loading: true, profile: null, missionLogs: {} }));

    const { container } = renderWithRouter(React.createElement(Home));

    const dash = screen.getByText("—");
    expect(dash.getAttribute("data-typography")).toBe("t1");
    expect(dash.getAttribute("color")).toBe("tertiary");
    // 페이지 셸(Top nav)이 여전히 렌더된다 — 흰 화면(트리 언마운트) 아님.
    expect(container.querySelector("nav")).not.toBeNull();
  });
});
