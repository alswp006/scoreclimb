import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";

mockAll();

import {
  SectionHeader,
  EmptyState,
  DisclaimerText,
  LoadingBlock,
} from "@/components/common";

const filePath = join(__dirname, "../components/common.tsx");
const fileContent = readFileSync(filePath, "utf-8");

function withRouter(ui: React.ReactElement) {
  return render(React.createElement(MemoryRouter, null, ui));
}

describe("공용 UI 프리미티브 (섹션헤더/빈상태/고지문)", () => {
  it("AC-1[P0]: SectionHeader는 Paragraph.Text(t4) + Spacing(12)로만 구성되고 인라인 padding/margin이 없다", () => {
    withRouter(React.createElement(SectionHeader, { title: "이번 달 요약" }));
    const heading = screen.getByText("이번 달 요약");
    expect(heading.getAttribute("data-typography")).toBe("t4");
    expect(heading.tagName.toLowerCase()).not.toBe("h1");
  });

  it("AC-1[P0]: common.tsx 소스에 인라인 padding/margin 스타일이 0건이다", () => {
    const inlineSpacingRegex = /style=\{\{[^}]*(padding|margin)[^}]*\}\}/g;
    const matches = fileContent.match(inlineSpacingRegex) || [];
    expect(matches.length).toBe(0);
    expect(fileContent).toContain("Spacing");
  });

  it("AC-2: EmptyState는 Asset.ContentIcon + Paragraph.Text + Button(size=large)로 구성되고 이모지가 없다", () => {
    withRouter(
      React.createElement(EmptyState, {
        iconName: "empty-box",
        message: "아직 기록이 없어요",
        ctaLabel: "첫 기록 추가하기",
        onCta: vi.fn(),
      }),
    );
    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "첫 기록 추가하기" });
    expect(button).toBeInTheDocument();
    expect(button.getAttribute("size")).toBe("large");

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(fileContent)).toBe(false);
  });

  it("AC-2: EmptyState의 onCta 클릭 시 콜백이 정확히 1회 호출된다", () => {
    const onCta = vi.fn();
    withRouter(
      React.createElement(EmptyState, {
        iconName: "empty-box",
        message: "아직 기록이 없어요",
        ctaLabel: "첫 기록 추가하기",
        onCta,
      }),
    );
    screen.getByRole("button", { name: "첫 기록 추가하기" }).click();
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("AC-3: DisclaimerText는 Paragraph.Text typography=st13 color=tertiary로 렌더된다", () => {
    withRouter(React.createElement(DisclaimerText, { text: "실제 신용점수와 다를 수 있어요" }));
    const el = screen.getByText("실제 신용점수와 다를 수 있어요");
    expect(el.getAttribute("data-typography")).toBe("st13");
    expect(el.getAttribute("color")).toBe("tertiary");
  });

  it("AC-4: common.tsx 소스에 HEX 색상 코드가 0건이다", () => {
    const hexColorRegex = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g;
    const hexMatches = fileContent.match(hexColorRegex) || [];
    expect(hexMatches.length).toBe(0);
  });

  it("AC-4: common.tsx 소스에 shadcn/MUI/Ant/Chakra import가 0건이다", () => {
    const forbiddenImportRegex = /from\s+["'](@mui|antd|@chakra-ui|shadcn|@\/components\/ui)/g;
    const matches = fileContent.match(forbiddenImportRegex) || [];
    expect(matches.length).toBe(0);
  });

  it("AC-5: LoadingBlock은 TDS Skeleton 기반 플레이스홀더를 콘솔 경고 없이 렌더한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    withRouter(React.createElement(LoadingBlock, null));

    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
