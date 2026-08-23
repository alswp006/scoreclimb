/**
 * Vitest setup — runs before each test file.
 *
 * Handles:
 *  - localStorage isolation between tests (prevents cross-test pollution)
 *  - requestAnimationFrame shim for jsdom (needed for animate/countup utilities)
 *  - sessionStorage isolation
 *  - console.error filtering (React Router warnings etc.)
 *  - `@/` alias support for literal require() calls in test files
 */

import { beforeEach, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import Module from "node:module";
import path from "node:path";
import fs from "node:fs";

// ── `require("@/...")` alias resolution ──
// Vite's `resolve.alias` only rewrites static `import` statements. A literal
// `require("@/lib/x")` call in a test file goes through Node's own (type-stripping)
// CJS resolver, which knows nothing about the `@/` alias or bare `.ts` extensions.
// Patch Module._resolveFilename so both work.
const projectRoot = path.resolve(import.meta.dirname, ".");
const originalResolveFilename = (Module as unknown as { _resolveFilename: (...args: unknown[]) => string })._resolveFilename;
(Module as unknown as { _resolveFilename: (...args: unknown[]) => string })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request.startsWith("@/")) {
    const resolved = path.resolve(projectRoot, "src", request.slice(2));
    request = fs.existsSync(resolved) ? resolved : `${resolved}.ts`;
  }
  return originalResolveFilename.call(this, request, ...rest);
};

// ── localStorage / sessionStorage isolation ──
// jsdom's storage persists between tests by default. Clear it to prevent pollution.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// ── requestAnimationFrame shim for jsdom ──
// jsdom does NOT implement rAF natively, so animate/countup code hangs forever.
// Shim that immediately invokes callback with a monotonic timestamp.
if (typeof globalThis.requestAnimationFrame !== "function") {
  let now = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    now += 16;
    return setTimeout(() => cb(now), 0) as unknown as number;
  }) as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof globalThis.cancelAnimationFrame;
}

// ── afterEach reset ──
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // in case a test used fake timers
});
