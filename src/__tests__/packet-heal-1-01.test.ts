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

describe("공용 UI 프리미티브 구현 (packet 0009 완성)", () => {
  it("AC-1[P0]: common.tsx가 SectionHeader/EmptyState/DisclaimerText/LoadingBlock 4개를 named export한다", () => {
    expect(typeof SectionHeader).toBe("function");
    expect(typeof EmptyState).toBe("function");
    expect(typeof DisclaimerText).toBe("function");
    expect(typeof LoadingBlock).toBe("function");
  });

  it("AC-2[P0]: SectionHeader는 Paragraph.Text(t4)와 Spacing(12)로만 구성되고 인라인 padding/margin이 없다", () => {
    withRouter(React.createElement(SectionHeader, { title: "이번 달 랭킹" }));
    const heading = screen.getByText("이번 달 랭킹");
    expect(heading.getAttribute("data-typography")).toBe("t4");

    const inlineSpacingRegex = /style=\{\{[^}]*(padding|margin)[^}]*\}\}/g;
    const matches = fileContent.match(inlineSpacingRegex) || [];
    expect(matches.length).toBe(0);
    expect(fileContent).toContain("Spacing size={12}");
  });

  it("AC-3: EmptyState는 Asset.ContentIcon + Paragraph.Text + Button(size=large)로 구성되고 onCta가 클릭 시 정확히 1회 호출된다", () => {
    const onCta = vi.fn();
    withRouter(
      React.createElement(EmptyState, {
        iconName: "empty-box",
        message: "비교할 기록이 아직 없어요",
        ctaLabel: "기록 추가하기",
        onCta,
      }),
    );
    expect(document.querySelector('[data-content-icon="empty-box"]')).toBeInTheDocument();
    expect(screen.getByText("비교할 기록이 아직 없어요")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "기록 추가하기" });
    expect(button.getAttribute("size")).toBe("large");

    button.click();
    expect(onCta).toHaveBeenCalledTimes(1);

    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiRegex.test(fileContent)).toBe(false);
  });

  it("AC-4: DisclaimerText는 Paragraph.Text typography=st13 color=tertiary로 렌더된다", () => {
    withRouter(React.createElement(DisclaimerText, { text: "참고용 정보이며 실제와 다를 수 있어요" }));
    const el = screen.getByText("참고용 정보이며 실제와 다를 수 있어요");
    expect(el.getAttribute("data-typography")).toBe("st13");
    expect(el.getAttribute("color")).toBe("tertiary");
  });

  it("AC-5: common.tsx 소스에 HEX 색상 코드와 shadcn/MUI/Ant/Chakra import가 0건이다", () => {
    const hexColorRegex = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g;
    const hexMatches = fileContent.match(hexColorRegex) || [];
    expect(hexMatches.length).toBe(0);

    const forbiddenImportRegex = /from\s+["'](@mui|antd|@chakra-ui|shadcn|@\/components\/ui)/g;
    const forbiddenMatches = fileContent.match(forbiddenImportRegex) || [];
    expect(forbiddenMatches.length).toBe(0);
  });

  it("AC-1: LoadingBlock은 TDS 로딩 프리미티브 기반 플레이스홀더를 콘솔 에러 없이 렌더한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    withRouter(React.createElement(LoadingBlock, null));
    expect(document.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
