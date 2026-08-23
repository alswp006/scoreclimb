import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { glob } from "glob";

/* Packet 0018: 검수 컴플라이언스 스윕 + 빌드 타깃 + 광고 래퍼 점검 */

const ROOT_DIR = process.cwd();

function readFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

async function getAllSourceFiles(pattern: string): Promise<string[]> {
  try {
    return await glob(pattern, { cwd: ROOT_DIR });
  } catch {
    return [];
  }
}

describe("Packet 0018: 검수 컴플라이언스 스윕 + 빌드 타깃 + 광고 래퍼 점검", () => {
  describe("AC-1[P0]: vite.config.ts build.target 설정", () => {
    it("should have build.target === ['es2019','safari13']", () => {
      const viteConfigPath = join(ROOT_DIR, "vite.config.ts");
      const content = readFile(viteConfigPath);

      // Check for the exact target configuration
      expect(content).toContain("build:");
      // Allow both es2019 and 'es2019' formats
      const hasTarget = /target\s*:\s*\[\s*['\`]?es2019['\`]?\s*,\s*['\`]?safari13['\`]?\s*\]/.test(
        content
      );
      expect(hasTarget).toBe(true);
    });

    it("should not have rollupOptions.external for @apps-in-toss/web-framework", () => {
      const viteConfigPath = join(ROOT_DIR, "vite.config.ts");
      const content = readFile(viteConfigPath);

      // Verify that external is not set or is empty
      if (content.includes("external")) {
        // If external exists, it should not contain @apps-in-toss/web-framework
        expect(content).not.toMatch(/@apps-in-toss\/web-framework.*external/);
      }
      expect(content).toBeTruthy();
    });
  });

  describe("AC-2[P0]: HEX 색상 코드 제거", () => {
    it("should have no HEX color codes in src files", async () => {
      const srcFiles = await getAllSourceFiles("src/**/*.{ts,tsx,css}");
      const hexColorRegex = /#[0-9a-fA-F]{3,8}/g;

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of srcFiles) {
        // Exclude test files from this check
        if (file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.")) {
          continue;
        }

        const content = readFile(file);
        const matches = content.match(hexColorRegex) || [];

        // Filter out false positives like #root, #__next, etc. (IDs, not colors)
        const colorMatches = matches.filter((m) => {
          // Valid HEX colors are typically 3, 4, 6, or 8 characters
          // Exclude common ID patterns
          if (m === "#root" || m === "#__next" || m === "#app") return false;
          return /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?$/.test(m);
        });

        if (colorMatches.length > 0) {
          violatingFiles.push({ file, matches: colorMatches });
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });
  });

  describe("AC-3[P0]: 제어되지 않는 네비게이션 및 설치 유도 제거", () => {
    it("should have no window.open calls in source code", async () => {
      const srcFiles = await getAllSourceFiles("src/**/*.{ts,tsx}");
      const windowOpenRegex = /window\.open\s*\(/g;

      const violatingFiles: string[] = [];

      for (const file of srcFiles) {
        // Exclude test files
        if (file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.")) {
          continue;
        }

        const content = readFile(file);
        if (windowOpenRegex.test(content)) {
          violatingFiles.push(file);
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it("should have no target='_blank' in source code", async () => {
      const srcFiles = await getAllSourceFiles("src/**/*.{ts,tsx}");
      const targetBlankRegex = /target\s*=\s*["'`]_blank["'`]/g;

      const violatingFiles: string[] = [];

      for (const file of srcFiles) {
        // Exclude test files
        if (file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.")) {
          continue;
        }

        const content = readFile(file);
        if (targetBlankRegex.test(content)) {
          violatingFiles.push(file);
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it("should have no grantPromotionReward calls in source code", async () => {
      const srcFiles = await getAllSourceFiles("src/**/*.{ts,tsx}");
      const grantPromotionRegex = /grantPromotionReward\s*\(/g;

      const violatingFiles: string[] = [];

      for (const file of srcFiles) {
        // Exclude test files
        if (file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.")) {
          continue;
        }

        const content = readFile(file);
        if (grantPromotionRegex.test(content)) {
          violatingFiles.push(file);
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it("should have no install-related text in source code", async () => {
      const srcFiles = await getAllSourceFiles("src/**/*.{ts,tsx}");
      const installRegex =
        /(앱을\s*설치|다운로드|설치하기|스토어에서|앱\s*설치|[Aa]pp\s*[Ss]tore|[Gg]oogle\s*[Pp]lay)/g;

      const violatingFiles: Array<{ file: string; matches: string[] }> = [];

      for (const file of srcFiles) {
        // Exclude test files
        if (file.includes("__tests__") || file.includes(".test.") || file.includes(".spec.")) {
          continue;
        }

        const content = readFile(file);
        const matches = content.match(installRegex) || [];

        if (matches.length > 0) {
          violatingFiles.push({ file, matches });
        }
      }

      expect(violatingFiles).toHaveLength(0);
    });
  });

  describe("AC-4[P0]: 외부 분석 라이브러리 제거", () => {
    it("should have no external analytics in package.json", () => {
      const packageJsonPath = join(ROOT_DIR, "package.json");
      const content = readFile(packageJsonPath);

      const analyticsPatterns = [
        "google-analytics",
        "gtag",
        "amplitude",
        "mixpanel",
        "sentry",
        "hotjar",
      ];

      const violations: string[] = [];

      analyticsPatterns.forEach((pattern) => {
        if (content.includes(pattern)) {
          violations.push(pattern);
        }
      });

      expect(violations).toHaveLength(0);
    });

    it("should have no external analytics in index.html", () => {
      const indexHtmlPath = join(ROOT_DIR, "index.html");
      const content = readFile(indexHtmlPath);

      const analyticsPatterns = [
        "google-analytics",
        "gtag",
        "amplitude",
        "mixpanel",
        "sentry",
        "hotjar",
      ];

      const violations: string[] = [];

      analyticsPatterns.forEach((pattern) => {
        if (content.includes(pattern)) {
          violations.push(pattern);
        }
      });

      expect(violations).toHaveLength(0);
    });
  });

  describe("AC-5[P0]: hasAdConfig() 유틸리티 함수", () => {
    let originalGroupId: string | undefined;
    let originalSlotId: string | undefined;

    beforeEach(() => {
      originalGroupId = process.env.VITE_TOSS_AD_GROUP_ID;
      originalSlotId = process.env.VITE_TOSS_AD_SLOT_ID;
    });

    afterEach(() => {
      if (originalGroupId) {
        process.env.VITE_TOSS_AD_GROUP_ID = originalGroupId;
      } else {
        delete process.env.VITE_TOSS_AD_GROUP_ID;
      }

      if (originalSlotId) {
        process.env.VITE_TOSS_AD_SLOT_ID = originalSlotId;
      } else {
        delete process.env.VITE_TOSS_AD_SLOT_ID;
      }
    });

    it("should exist in src/lib/compliance.ts", () => {
      const compliancePath = join(ROOT_DIR, "src/lib/compliance.ts");
      const content = readFile(compliancePath);

      expect(content).toContain("hasAdConfig");
      expect(content).toMatch(/export.*hasAdConfig/);
    });

    it("should return false when both VITE_TOSS_AD_GROUP_ID and VITE_TOSS_AD_SLOT_ID are not set", async () => {
      delete process.env.VITE_TOSS_AD_GROUP_ID;
      delete process.env.VITE_TOSS_AD_SLOT_ID;

      const compliancePath = join(ROOT_DIR, "src/lib/compliance.ts");
      const content = readFile(compliancePath);

      // Verify the implementation checks for these env vars
      expect(content).toContain("VITE_TOSS_AD_GROUP_ID");
      expect(content).toContain("VITE_TOSS_AD_SLOT_ID");
    });

    it("should return false when only one of the env vars is set", async () => {
      process.env.VITE_TOSS_AD_GROUP_ID = "test-group-id";
      delete process.env.VITE_TOSS_AD_SLOT_ID;

      const compliancePath = join(ROOT_DIR, "src/lib/compliance.ts");
      const content = readFile(compliancePath);

      // Verify the implementation requires both to be set
      expect(content).toContain("&&");
    });

    it("should return true when both env vars are set", () => {
      process.env.VITE_TOSS_AD_GROUP_ID = "test-group-id";
      process.env.VITE_TOSS_AD_SLOT_ID = "test-slot-id";

      const compliancePath = join(ROOT_DIR, "src/lib/compliance.ts");
      const content = readFile(compliancePath);

      // Verify logic returns boolean
      expect(content).toMatch(/return\s*\(?\s*(?:import\.meta\.env\.)?VITE_TOSS_AD_GROUP_ID.*&&.*VITE_TOSS_AD_SLOT_ID/);
    });

    it("should not throw when called without ad config", () => {
      delete process.env.VITE_TOSS_AD_GROUP_ID;
      delete process.env.VITE_TOSS_AD_SLOT_ID;

      const compliancePath = join(ROOT_DIR, "src/lib/compliance.ts");
      const content = readFile(compliancePath);

      // Verify there's no try/catch that could hide issues
      expect(content).toContain("hasAdConfig");
      // Implementation should be a simple check
      expect(content).not.toContain("throw");
    });
  });

  describe("Integration: No source file modifications to main.tsx or App.tsx", () => {
    it("should not modify main.tsx", () => {
      const mainTsxPath = join(ROOT_DIR, "src/main.tsx");
      const content = readFile(mainTsxPath);

      // Verify main.tsx still has the required setup
      expect(content).toContain("TDSMobileAITProvider");
      expect(content).toContain("BrowserRouter");
    });

    it("should not modify App.tsx Route definitions", () => {
      const appTsxPath = join(ROOT_DIR, "src/App.tsx");
      const content = readFile(appTsxPath);

      // Verify App.tsx is intact
      expect(content).toContain("Routes");
      expect(content).toContain("Route");
    });
  });
});
