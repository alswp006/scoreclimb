import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import type { AppFlags } from "@/lib/types";

// TDS crashes in jsdom without this mock; SDK calls (haptic) throw outside WebView without this mock.
mockTds();
mockAppsInToss();

// Page components for /onboarding, /missions, /badges, /simulate, /simulate/result, /report
// do not exist yet (this packet only builds the routing tree in App.tsx). Stub them so this
// test exercises ROUTING behavior, not page content — the Coder still must create real files
// at these exact paths for App.tsx to import and for these mocks to intercept.
vi.mock("@/pages/Onboarding", () => ({
  default: () => React.createElement("div", { "data-testid": "page-onboarding" }, "온보딩"),
}));
vi.mock("@/pages/Missions", () => ({
  default: () => React.createElement("div", { "data-testid": "page-missions" }, "미션"),
}));
vi.mock("@/pages/Badges", () => ({
  default: () => React.createElement("div", { "data-testid": "page-badges" }, "배지"),
}));
vi.mock("@/pages/Simulate", () => ({
  default: () => React.createElement("div", { "data-testid": "page-simulate" }, "시뮬레이션"),
}));
vi.mock("@/pages/SimulateResult", () => ({
  default: () => React.createElement("div", { "data-testid": "page-simulate-result" }, "시뮬레이션 결과"),
}));
vi.mock("@/pages/Report", () => ({
  default: () => React.createElement("div", { "data-testid": "page-report" }, "리포트"),
}));

import App from "@/App";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

const FLAGS_KEY = "scoreclimb.flags.v1";

function setFlags(overrides: Partial<AppFlags>) {
  const flags: AppFlags = { onboardingDone: true, disclaimerAckedAt: null, ...overrides };
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
}

function renderApp(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    React.createElement(MemoryRouter, { initialEntries }, React.createElement(App)),
  );
}

describe("Packet 0017: 라우팅 트리 + 부트 게이트 + FloatingTabBar 배선", () => {
  beforeEach(() => {
    setFlags({ onboardingDone: true });
  });

  // AC-1[P0]: all 7 routes render their page without a blank screen
  it("AC-1[P0]: renders the matching page for each of the 7 registered routes", () => {
    const routes: Array<[string, string]> = [
      ["/onboarding", "page-onboarding"],
      ["/", "home-hero"],
      ["/missions", "page-missions"],
      ["/badges", "page-badges"],
      ["/simulate", "page-simulate"],
      ["/simulate/result", "page-simulate-result"],
      ["/report", "page-report"],
    ];

    routes.forEach(([path, testId]) => {
      const { unmount } = renderApp([path]);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      unmount();
    });
  });

  it("AC-1: /simulate/result renders without crashing when navigated with a location.state result payload", () => {
    renderApp([{ pathname: "/simulate/result", state: { result: { predictedScore: 720 } } }]);
    expect(screen.getByTestId("page-simulate-result")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // AC-2[P0]: boot gate redirects '/' to '/onboarding' when onboardingDone === false
  it("AC-2[P0]: redirects '/' to '/onboarding' when flags.onboardingDone is false", () => {
    setFlags({ onboardingDone: false });
    renderApp(["/"]);
    expect(screen.getByTestId("page-onboarding")).toBeInTheDocument();
    expect(screen.queryByTestId("home-hero")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: does not redirect '/' when flags.onboardingDone is true", () => {
    setFlags({ onboardingDone: true });
    renderApp(["/"]);
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("page-onboarding")).not.toBeInTheDocument();
  });

  // AC-3[P0]: unknown routes redirect to '/' with no 404 blank screen
  it("AC-3[P0]: redirects an unknown path to '/' and renders Home instead of a blank screen", () => {
    setFlags({ onboardingDone: true });
    renderApp(["/foo"]);
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
    expect(document.body.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("AC-3: an unknown path combined with onboardingDone=false lands on onboarding, never a blank 404", () => {
    setFlags({ onboardingDone: false });
    renderApp(["/foo"]);
    expect(screen.getByTestId("page-onboarding")).toBeInTheDocument();
    expect(screen.queryByText(/404/i)).not.toBeInTheDocument();
  });

  // AC-4[P0]: FloatingTabBar 4 tabs, navigate()-only switching, active tab matches path, tickWeak haptic
  it("AC-4[P0]: renders 4 tabs and switches route + fires tickWeak haptic when a tab is clicked", async () => {
    renderApp(["/"]);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);

    const homeTab = screen.getByRole("tab", { name: "홈" });
    expect(homeTab).toHaveAttribute("aria-selected", "true");

    const missionsTab = screen.getByRole("tab", { name: "미션" });
    expect(missionsTab).toHaveAttribute("aria-selected", "false");

    missionsTab.click();

    expect(await screen.findByTestId("page-missions")).toBeInTheDocument();
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });

  it("AC-4[P0]: active tab reflects the current route on direct entry to a tab route", () => {
    renderApp(["/report"]);

    const reportTab = screen.getByRole("tab", { name: "리포트" });
    const homeTab = screen.getByRole("tab", { name: "홈" });
    expect(reportTab).toHaveAttribute("aria-selected", "true");
    expect(homeTab).toHaveAttribute("aria-selected", "false");
  });

  // AC-5[P0]: main.tsx untouched (@AI:ANCHOR) and production build passes
  it("AC-5[P0]: main.tsx keeps its @AI:ANCHOR marker and BrowserRouter/TDSMobileAITProvider wiring intact", () => {
    const mainTsxPath = join(__dirname, "../main.tsx");
    const content = readFileSync(mainTsxPath, "utf-8");
    expect(content).toContain("@AI:ANCHOR");
    expect(content).toContain("TDSMobileAITProvider");
    expect(content).toContain("BrowserRouter");
  });

  it("AC-5[P0]: `vite build` succeeds and emits dist/index.html", () => {
    const cwd = join(__dirname, "../..");
    execSync("npx vite build", { cwd, stdio: "pipe" });
    const indexPath = join(cwd, "dist/index.html");
    expect(existsSync(indexPath)).toBe(true);
    expect(readFileSync(indexPath, "utf-8").length).toBeGreaterThan(0);
  }, 120_000);

  // Integration: every RouteState path has a matching <Route> in App.tsx
  it("Integration: App.tsx defines a Route for every RouteState path", () => {
    const appTsxPath = join(__dirname, "../App.tsx");
    const content = readFileSync(appTsxPath, "utf-8");
    const requiredPaths = ["/onboarding", "/", "/missions", "/badges", "/simulate", "/simulate/result", "/report"];

    requiredPaths.forEach((p) => {
      const hasPath = content.includes(`"${p}"`) || content.includes(`'${p}'`);
      expect(hasPath).toBe(true);
    });
    expect((content.match(/<Route\s/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });
});
