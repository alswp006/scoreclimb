/**
 * Shared test mocks for Toss Mini App packets.
 *
 * Usage at the top of any test file:
 *   import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
 *   mockTds();
 *   mockAppsInToss();
 *   mockRouter();
 *
 * Or use all at once:
 *   import { mockAll } from "@/__tests__/__helpers__/mocks";
 *   mockAll();
 */

import React from "react";
import { vi } from "vitest";

export const mockNavigate = vi.fn();
export const mockLocation = { pathname: "/", search: "", state: null, key: "default" };

// ── TDS (@toss/tds-mobile) ──
// TDS components use CSS-in-JS + layout hooks that crash in jsdom.
// Replace with lightweight DOM stand-ins that preserve prop-based testing.
export function mockTds() {
  vi.mock("@toss/tds-mobile", () => ({
    Button: ({ children, onClick, ...props }: any) =>
      React.createElement("button", { onClick, ...props }, children),

    // Real TDS ListRow renders content via left/contents/right render-prop slots
    // (NOT children) — see node_modules/@toss/tds-mobile .d.ts ListRowProps.
    ListRow: Object.assign(
      ({ children, left, contents, right, onClick, ...props }: any) =>
        React.createElement(
          "div",
          { onClick, role: "listitem", ...props },
          left,
          contents,
          children,
          right,
        ),
      {
        Text: ({ children }: any) => React.createElement("span", null, children),
        Texts: ({ top, bottom, type }: any) =>
          React.createElement(
            React.Fragment,
            null,
            React.createElement("span", { "data-type": type, "data-slot": "top" }, top),
            React.createElement("span", { "data-slot": "bottom" }, bottom),
          ),
      },
    ),

    Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),

    Paragraph: {
      Text: ({ children, typography, ...props }: any) =>
        React.createElement("span", { "data-typography": typography, ...props }, children),
    },

    Badge: ({ children }: any) => React.createElement("span", { role: "status" }, children),

    AlertDialog: Object.assign(
      ({ open, title, description, alertButton, onClose }: any) =>
        open
          ? React.createElement(
              "div",
              { role: "alertdialog", "aria-label": title },
              React.createElement("h2", null, title),
              React.createElement("p", null, description),
              alertButton,
              React.createElement("button", { onClick: onClose, "aria-label": "닫기" }, "닫기"),
            )
          : null,
      {
        AlertButton: ({ children, onClick }: any) =>
          React.createElement("button", { onClick }, children),
      },
    ),

    Toast: ({ open, text, position }: any) =>
      open
        ? React.createElement("div", { role: "status", "data-position": position }, text)
        : null,

    Tab: Object.assign(
      ({ children }: any) => React.createElement("div", { role: "tablist" }, children),
      {
        Item: ({ children, selected, onClick }: any) =>
          React.createElement(
            "button",
            { role: "tab", "aria-selected": selected, onClick },
            children,
          ),
      },
    ),

    // NOTE: TDS has NO "TabBar" export (hallucinated API). 하단 탭은 로컬
    // src/components/FloatingTabBar 를 쓰며, 그 컴포넌트는 TDS를 import하지 않아
    // 여기서 목킹할 필요가 없다(react-router/SDK 목만 있으면 jsdom에서 그대로 렌더).

    Asset: {
      Icon: ({ name, alt }: any) =>
        React.createElement("span", { "data-asset": name, role: "img", "aria-label": alt ?? name }),
      Image: ({ src, alt }: any) => React.createElement("img", { src, alt }),
      ContentIcon: ({ name, alt }: any) =>
        React.createElement("span", { "data-content-icon": name, role: "img", "aria-label": alt ?? name }),
      ContentImage: ({ src, alt }: any) => React.createElement("img", { src, alt }),
      Lottie: () => React.createElement("span", { "data-asset": "lottie" }),
      Text: ({ children }: any) => React.createElement("span", null, children),
      Video: () => React.createElement("span", { "data-asset": "video" }),
    },

    Skeleton: () => React.createElement("div", { "data-skeleton": "true", role: "presentation" }),

    Loader: () => React.createElement("div", { role: "progressbar" }),

    IconButton: ({ "aria-label": ariaLabel, name, onClick }: any) =>
      React.createElement("button", { "aria-label": ariaLabel, "data-icon": name, onClick }),

    TextButton: ({ children, onClick }: any) =>
      React.createElement("button", { onClick }, children),

    TextField: React.forwardRef(
      ({ label, help, hasError, variant, ...props }: any, ref: any) =>
        React.createElement(
          "div",
          null,
          React.createElement("label", null, label),
          React.createElement("input", { ref, "data-variant": variant, ...props }),
          hasError && help && React.createElement("span", { role: "alert" }, help),
        ),
    ),

    Top: Object.assign(
      ({ children, title, right }: any) =>
        React.createElement(
          "nav",
          { role: "navigation" },
          title && React.createElement("h1", null, title),
          right,
          children,
        ),
      {
        TitleParagraph: ({ children }: any) => React.createElement("h1", null, children),
      },
    ),

    Border: () => React.createElement("hr"),

    BottomCTA: ({ children }: any) =>
      React.createElement("div", { "data-slot": "bottom-cta" }, children),

    // FixedBottomCTA is itself a <button> (.d.ts: HTMLButtonElement ref) — do NOT
    // nest another Button inside it in real pages (invalid button>button HTML).
    FixedBottomCTA: Object.assign(
      ({ children, onClick, disabled, ...props }: any) =>
        React.createElement("button", { onClick, disabled, ...props }, children),
      {
        Double: ({ primary, secondary }: any) =>
          React.createElement(
            "div",
            { "data-slot": "fixed-bottom-cta-double" },
            React.createElement("button", { onClick: primary?.onClick, disabled: primary?.disabled }, primary?.label),
            React.createElement("button", { onClick: secondary?.onClick }, secondary?.label),
          ),
      },
    ),

    BottomSheet: Object.assign(
      ({ children, open }: any) =>
        open ? React.createElement("div", { role: "dialog" }, children) : null,
      { Header: ({ children }: any) => React.createElement("div", null, children) },
    ),

    // Real TDS Chip is typically used as <Chip label="..." variant="filled|outlined" />.
    // Fall back to children for the ChipItem-style usage some pages may use.
    Chip: ({ children, label, selected, variant, onClick }: any) =>
      React.createElement(
        "button",
        { role: "button", "aria-pressed": selected, "data-variant": variant, onClick },
        children ?? label,
      ),

    Switch: ({ checked, onChange }: any) =>
      React.createElement("input", { type: "checkbox", checked, onChange, role: "switch" }),
  }));
}

// ── @apps-in-toss/web-framework ──
// Mocks the REAL SDK exports (verified from .d.ts).
// SDK is imperative (no hooks). Callback-style APIs invoke onEvent immediately for test speed.
export function mockAppsInToss() {
  vi.mock("@apps-in-toss/web-framework", () => {
    const Storage = {
      setItem: vi.fn(async (k: string, v: string) => { localStorage.setItem(k, v); }),
      getItem: vi.fn(async (k: string) => localStorage.getItem(k)),
      removeItem: vi.fn(async (k: string) => { localStorage.removeItem(k); }),
      clearItems: vi.fn(async () => { localStorage.clear(); }),
    };

    const Analytics = {
      screen: vi.fn(async () => {}),
      impression: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
    };

    // Imperative ad API — auto-fires onEvent so tests don't hang
    const loadFullScreenAd = vi.fn((opts: { onEvent?: (e: any) => void; onError?: (e: any) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
    });
    const showFullScreenAd = vi.fn((opts: { onEvent?: (e: any) => void; onError?: (e: any) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
    });
    // TossAds banner API (real SDK exports — see @apps-in-toss/web-bridge .d.ts)
    const TossAds = {
      initialize: Object.assign(vi.fn(), { isSupported: () => true }),
      attachBanner: Object.assign(
        vi.fn(() => ({ destroy: vi.fn() })),
        { isSupported: () => true },
      ),
      attach: Object.assign(vi.fn(), { isSupported: () => true }),
      destroy: Object.assign(vi.fn(), { isSupported: () => true }),
      destroyAll: Object.assign(vi.fn(), { isSupported: () => true }),
    };

    // IAP
    const createOneTimePurchaseOrder = vi.fn((opts: any) => {
      setTimeout(async () => {
        const granted = await opts.options.processProductGrant({ orderId: "test-order-1" });
        if (granted) {
          opts.onEvent?.({
            type: "success",
            data: {
              orderId: "test-order-1",
              displayName: "Test Product",
              displayAmount: "1,000원",
              amount: 1000,
              currency: "KRW",
              fraction: 0,
              miniAppIconUrl: null,
            },
          });
        }
      }, 0);
    });
    const createSubscriptionPurchaseOrder = vi.fn((opts: any) => {
      setTimeout(async () => {
        const granted = await opts.options.processProductGrant({
          orderId: "test-sub-1",
          subscriptionId: "test-sub",
        });
        if (granted) {
          opts.onEvent?.({
            type: "success",
            data: {
              orderId: "test-sub-1",
              displayName: "Test Subscription",
              displayAmount: "4,900원/월",
              amount: 4900,
              currency: "KRW",
              fraction: 0,
              miniAppIconUrl: null,
            },
          });
        }
      }, 0);
    });

    return {
      Storage,
      Analytics,

      generateHapticFeedback: vi.fn(),
      grantPromotionReward: vi.fn(async () => {}),
      getIsTossLoginIntegratedService: vi.fn(async () => false),

      loadFullScreenAd,
      showFullScreenAd,
      TossAds,

      // IAP 실제 API는 IAP 네임스페이스 아래에 있다(.d.ts 검증). 각 메서드는 cleanup 함수 반환.
      // (최상위 이름은 하위호환용으로 유지 — 실제 SDK 최상위 export 아님)
      createOneTimePurchaseOrder,
      createSubscriptionPurchaseOrder,
      IAP: {
        createOneTimePurchaseOrder: vi.fn((opts: any) => {
          createOneTimePurchaseOrder(opts);
          return () => {};
        }),
        createSubscriptionPurchaseOrder: vi.fn((opts: any) => {
          createSubscriptionPurchaseOrder(opts);
          return () => {};
        }),
      },

      // Misc bridge
      share: vi.fn(async () => {}),
      setClipboardText: vi.fn(async () => {}),
      getClipboardText: vi.fn(async () => ""),
      requestReview: vi.fn(async () => {}),
      openURL: vi.fn(async () => {}),
      getPlatformOS: vi.fn(async () => "ios"),
      getNetworkStatus: vi.fn(async () => ({ connected: true, type: "wifi" })),
      getTossAppVersion: vi.fn(async () => "5.0.0"),
      getOperationalEnvironment: vi.fn(async () => "development"),
      getPermission: vi.fn(async () => ({ granted: true })),
      getSchemeUri: vi.fn(async () => "intoss://test-app"),
    };
  });
}

// ── Toss Reward Ad Component ──
// TossRewardAd is a project-local component that wraps content behind ad viewing.
// In tests, render the children directly (ad always "watched") inside a
// data-testid="reward-ad-mock" wrapper carrying data-slot-id — lets tests assert
// both the gate's presence/slotId and inspect gated content via within(gate).
//
// ⚠️ vi.mock() is hoisted to the top of THIS file even though it's written inside
// this function body — importing any named export from this module (mockTds,
// mockAppsInToss, ...) is enough to register it, whether or not mockTossRewardAd()
// is ever called. A test-file-local `vi.mock("@/components/TossRewardAd", ...)`
// cannot reliably override this registration, so this IS the single source of
// truth for the mock shape — keep it in sync with any test relying on it.
export function mockTossRewardAd() {
  vi.mock("@/components/TossRewardAd", () => ({
    TossRewardAd: ({ children, slotId, onReward, onRewarded }: any) => {
      // Auto-trigger reward callback(s) in tests to unlock content
      if (onReward) setTimeout(onReward, 0);
      if (onRewarded) setTimeout(onRewarded, 0);
      return React.createElement(
        "div",
        { "data-testid": "reward-ad-mock", "data-slot-id": slotId },
        children,
      );
    },
    default: ({ children }: any) => children,
  }));
}

// ── react-router-dom ──
// Preserve actual router + override useNavigate for assertion.
//
// ⚠️ 이 스텁은 '옵트인'이어야 한다. vitest는 vi.mock을 함수 안에 써도 파일 최상단으로
// 호이스팅하므로, mockTds()만 쓰려고 이 파일을 import한 테스트에도 라우터 목이 함께
// 등록된다. 예전 구현은 그 상태에서 무조건 스텁을 돌려줬고, 그 결과 실제 라우팅을
// 검증하려던 테스트에서 useNavigate()가 아무 데도 이동하지 않아 탭 활성표시·리다이렉트가
// 조용히 죽었다. 그래서 플래그로 게이트한다 — mockRouter()/mockAll()을 호출한 테스트에서만
// useNavigate 스텁이 켜지고, 나머지는 진짜 라우터가 돈다.
//
// useLocation은 항상 실제 훅에 위임한다 — renderWithRouter(ui, { initialEntries: [{ state }] })
// 로 RouteState를 주입하는 테스트(location.state 읽기 검증)가 mockRouter()와 함께 쓰여도
// 깨지지 않아야 하며, 어떤 테스트도 고정된 mockLocation 객체 값에 의존하지 않는다.
let routerStubEnabled = false;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => (routerStubEnabled ? mockNavigate : actual.useNavigate()),
    useLocation: () => actual.useLocation(),
  };
});

export function mockRouter() {
  routerStubEnabled = true;
}

// ── Convenience: mock everything ──
export function mockAll() {
  mockTds();
  mockAppsInToss();
  mockTossRewardAd();
  mockRouter();
}
