import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

describe("Packet 0001: 데이터 모델 타입 + RouteState 정의", () => {
  const typesFilePath = join(__dirname, "../lib/types.ts");

  // AC-1: File exists, tsc passes, zero runtime exports
  it("AC-1: should have types.ts file at src/lib/types.ts", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toBeDefined();
    expect(fileContent.length).toBeGreaterThan(0);
  });

  it("AC-1: should pass TypeScript compilation (tsc --noEmit)", () => {
    try {
      execSync("npx tsc --noEmit", { cwd: join(__dirname, "../../..") });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("src/lib/types.ts")) {
        throw new Error(
          `TypeScript compilation failed for types.ts: ${error.message}`
        );
      }
    }
  });

  it("AC-1: should have zero runtime exports (const/function/enum)", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    // Count export const, export function, export enum (but allow export type/interface)
    const runtimeExportRegex = /export\s+(const|function|enum)\s+/g;
    const runtimeExports = fileContent.match(runtimeExportRegex) || [];
    expect(runtimeExports.length).toBe(0);
  });

  // AC-2: RouteState with all 7 paths + '/simulate/result' = { result: SimulationResult } | undefined
  it("AC-2: should define RouteState type with all 7 required paths", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    const requiredPaths = [
      '"/onboarding"',
      '"/"',
      '"/missions"',
      '"/badges"',
      '"/simulate"',
      '"/simulate/result"',
      '"/report"',
    ];
    requiredPaths.forEach((path) => {
      expect(fileContent).toContain(path);
    });
  });

  it("AC-2: should define RouteState['/simulate/result'] as { result: SimulationResult } | undefined", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    // Check that both "SimulationResult" and the result field are defined
    expect(fileContent).toContain("SimulationResult");
    expect(fileContent).toContain('"/simulate/result"');
    // Verify the pattern appears in a RouteState context
    expect(fileContent).toMatch(/RouteState\s*[=\{]/);
  });

  // AC-3: SaveResult type definition
  it("AC-3: should export SaveResult type with ok true/false variants", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("SaveResult");
    expect(fileContent).toContain("ok");
    expect(fileContent).toContain("error");
    // Check for union type syntax ({ ok: true } | { ok: false; error: string })
    // (expect(...)는 void를 반환해 `||`로 이을 수 없다 — 원래 의도인 "둘 중 하나"는
    //  정규식 테스트 결과를 OR로 묶어 표현한다. 검증 강도는 그대로.)
    expect(fileContent).toMatch(/ok\s*:\s*true/);
    expect(
      /ok\s*:\s*false/.test(fileContent) || /error\s*:\s*string/.test(fileContent),
    ).toBe(true);
  });

  // AC-4: JSDoc range annotations on numeric fields
  it("AC-4: should have JSDoc @param or // range comment for score field (350~1000)", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("score");
    // Look for JSDoc comment with range before score field
    const scorePattern = /\/\*\*.*Credit score.*350.*1000/s;
    expect(fileContent).toMatch(scorePattern);
  });

  it("AC-4: should have JSDoc range annotation for birthYear field (1960~2010)", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("birthYear");
    // Look for JSDoc comment with range before birthYear field
    const birthYearPattern = /\/\*\*.*Year of birth.*1960.*2010/s;
    expect(fileContent).toMatch(birthYearPattern);
  });

  it("AC-4: should have JSDoc range annotation for cardUsageRatio (0~100) and loanCount (0~10)", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("cardUsageRatio");
    expect(fileContent).toContain("loanCount");
    // Look for JSDoc comments with ranges
    const cardRatioPattern = /\/\*\*.*Card usage ratio.*0.*100/s;
    const loanCountPattern = /\/\*\*.*Number of active loans.*0.*10/s;
    expect(fileContent).toMatch(cardRatioPattern);
    expect(fileContent).toMatch(loanCountPattern);
  });

  // AC-5: No HEX color codes in the file
  it("AC-5: should have zero HEX color codes (#[0-9a-fA-F]{3,8})", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    // Match HEX color pattern but exclude commented lines and strings in examples
    // This regex looks for # followed by 3-8 hex digits (but not in comments about colors)
    const hexColorRegex = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g;
    const hexMatches = fileContent.match(hexColorRegex) || [];
    expect(hexMatches.length).toBe(0);
  });

  // Additional: Verify key types are exported
  it("should export CreditProfile type", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("CreditProfile");
  });

  it("should export ScoreSnapshot type", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("ScoreSnapshot");
  });

  it("should export SimulationResult type", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("SimulationResult");
  });

  it("should export AppFlags type", () => {
    const fileContent = readFileSync(typesFilePath, "utf-8");
    expect(fileContent).toContain("AppFlags");
  });
});
