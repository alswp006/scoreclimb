import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { MISSION_DEFINITIONS, STORAGE_KEYS } from "@/lib/constants";
import { todayKey } from "@/lib/date";
import type { MissionLogMap } from "@/lib/types";

// TDS + @apps-in-toss/web-framework + react-router-dom mocks.
// @/hooks/useAppData is intentionally NOT mocked here — this page's ACs (AC-2, AC-3, AC-4)
// depend on useAppData's real localStorage persistence + streak computation, which already
// exists and is not what this packet builds. Only src/pages/Missions.tsx is new.
mockAll();

import Missions from "@/pages/Missions";

function seedTodayLog(completedMissionIds: string[]) {
  const date = todayKey();
  const totalPoints = completedMissionIds.reduce((sum, id) => {
    const m = MISSION_DEFINITIONS.find((def) => def.id === id);
    return sum + (m?.points ?? 0);
  }, 0);
  const logs: MissionLogMap = {
    [date]: { date, completedMissionIds, totalPoints },
  };
  seedLocalStorage({ [STORAGE_KEYS.missionLogs]: logs });
}

function getRowByMissionId(missionId: string): HTMLElement {
  const rows = screen.getAllByTestId("mission-row");
  const row = rows.find((r) => r.getAttribute("data-mission-id") === missionId);
  if (!row) throw new Error(`row not found for ${missionId}`);
  return row;
}

describe("S3 미션 체크리스트 /missions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]-a: MISSION_DEFINITIONS 6종이 모두 mission-row로 렌더되고 title/description/+N점이 표시된다", () => {
    renderWithRouter(React.createElement(Missions));

    const rows = screen.getAllByTestId("mission-row");
    expect(rows).toHaveLength(6);

    const ids = rows.map((r) => r.getAttribute("data-mission-id"));
    expect(ids).toEqual(MISSION_DEFINITIONS.map((m) => m.id));
  });

  it("AC-1[P0]-b: 개별 mission-row에 해당 미션의 title, description, +N점 텍스트가 모두 포함된다", () => {
    renderWithRouter(React.createElement(Missions));

    const row = getRowByMissionId("m_no_late");
    expect(row.textContent).toContain("연체 없이 하루 보내기");
    expect(row.textContent).toContain("오늘 결제일이 있다면 늦지 않게 처리해요");
    expect(row.textContent).toContain("+3점");
  });

  it("AC-2: 미션 토글 후 재마운트해도 localStorage 오늘자 로그에서 완료 상태가 복원된다", () => {
    const { unmount } = renderWithRouter(React.createElement(Missions));

    const row = getRowByMissionId("m_card_usage");
    const toggle = within(row).getByRole("switch") as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);

    unmount();

    renderWithRouter(React.createElement(Missions));
    const restoredRow = getRowByMissionId("m_card_usage");
    const restoredToggle = within(restoredRow).getByRole("switch") as HTMLInputElement;
    expect(restoredToggle.checked).toBe(true);

    const raw = localStorage.getItem(STORAGE_KEYS.missionLogs);
    const logs = JSON.parse(raw ?? "{}") as MissionLogMap;
    expect(logs[todayKey()].completedMissionIds).toContain("m_card_usage");
  });

  it("AC-3[P0]: 3번째 미션을 완료하는 순간에만 '오늘 출석 완료! 연속 N일이에요' Toast가 1회 표시된다", () => {
    renderWithRouter(React.createElement(Missions));

    fireEvent.click(within(getRowByMissionId("m_card_usage")).getByRole("switch"));
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(within(getRowByMissionId("m_no_late")).getByRole("switch"));
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(within(getRowByMissionId("m_auto_pay")).getByRole("switch"));

    const toasts = screen.getAllByRole("status");
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveTextContent("오늘 출석 완료! 연속 1일이에요");
  });

  it("AC-4[P0]: 상단 요약이 획득 점수 합계/12점으로 표시되고 토글마다 즉시 갱신된다", () => {
    seedTodayLog(["m_card_usage", "m_no_late"]); // 2 + 3 = 5점, 2개 완료

    renderWithRouter(React.createElement(Missions));

    const progress = screen.getByTestId("mission-progress");
    expect(progress).toHaveTextContent("2/6");
    expect(progress).toHaveTextContent("5점");

    fireEvent.click(within(getRowByMissionId("m_auto_pay")).getByRole("switch"));

    expect(progress).toHaveTextContent("3/6");
    expect(progress).toHaveTextContent("7점");
  });

  it("AC-5: 모든 mission-row 높이가 44px 이상이고 Switch 토글 시 tickWeak 햅틱이 호출된다", async () => {
    renderWithRouter(React.createElement(Missions));

    const rows = screen.getAllByTestId("mission-row");
    rows.forEach((row) => {
      const minHeight = parseInt(getComputedStyle(row).minHeight || "0", 10);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    fireEvent.click(within(getRowByMissionId("m_card_usage")).getByRole("switch"));

    const { generateHapticFeedback } = await import("@apps-in-toss/web-framework");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });
});
