/**
 * jest-dom 매처(toBeInTheDocument / toHaveAttribute 등)의 타입 증강을 tsc에 알린다.
 *
 * vitest.setup.ts는 런타임에 "@testing-library/jest-dom/vitest"를 import하지만
 * tsconfig의 include가 ["src"]라 setup 파일이 타입 검사 그래프에 들어오지 않는다.
 * 그래서 테스트는 통과하는데 `npx tsc --noEmit`만 TS2339로 터졌다 — 이 파일이 그 간극을 메운다.
 */
import "@testing-library/jest-dom/vitest";
