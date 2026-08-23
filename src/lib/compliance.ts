/**
 * 토스 검수 컴플라이언스 — 금지 패턴 상수 + 런타임 가드 유틸.
 *
 * 앱인토스 검수에서 즉시 반려되는 패턴(HEX 하드코딩·외부 도메인 이탈·인스톨 유도·
 * 외부 분석 SDK·프로모션 지급)을 한 곳에 모아 문서화한다. 규칙을 코드로 들고 있어야
 * 새 화면이 붙을 때마다 사람이 기억에 의존하지 않는다.
 *
 * ⚠️ 이 파일 자체가 소스 스캐너(src/__tests__/packet-0018.test.ts)의 검사 대상이다.
 *    그래서 한국어 금지어는 **조각을 이어 붙여**, 정규식 금지어는 **이스케이프된 정규식
 *    리터럴**로 적는다 — 규칙을 적는 행위가 규칙 위반이 되지 않도록.
 */

/** 컴플라이언스 규칙 하나 — 규칙 id, 사람이 읽는 설명, 소스에서 찾을 패턴. */
export interface ComplianceRule {
  /** 안정적인 식별자 (리포트/테스트에서 참조) */
  id: ComplianceRuleId;
  /** 왜 금지인지 — 검수 반려 사유 */
  description: string;
  /** 소스 텍스트에서 위반을 찾는 정규식 (전역 플래그 없이 — lastIndex 상태 오염 방지) */
  pattern: RegExp;
}

/** 규칙 식별자 */
export type ComplianceRuleId =
  | 'hex-color'
  | 'external-navigation'
  | 'blank-target'
  | 'promotion-reward'
  | 'install-prompt'
  | 'external-analytics';

/**
 * HEX 색상 하드코딩 금지 — 다크모드에서 텍스트가 배경에 묻힌다.
 * 대체: TDS 컴포넌트 기본 색 또는 `var(--tds-color-*)` / `var(--adaptive*)` CSS 변수.
 * (`#root` 같은 DOM id 셀렉터는 3·6·8자리 HEX 형태가 아니므로 걸리지 않는다.)
 */
const HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])/;

/**
 * 외부 도메인 이탈(Outlink) 금지 — 미니앱은 토스 앱 안에서 모든 흐름이 끝나야 한다.
 * 대체: 라우터 내부 이동(`useNavigate`). 외부 링크가 꼭 필요하면 SDK 네비게이션 API.
 */
const EXTERNAL_NAVIGATION_PATTERN = /window\.open\s*\(|window\.location\.(?:href|assign|replace)\s*[=(]/;

/** 새 탭 이탈 금지 — 위와 같은 사유(WebView에는 탭이 없다). */
const BLANK_TARGET_PATTERN = /target\s*=\s*["'`]_blank["'`]/;

/**
 * 프로모션 지급 API 호출 금지 — 콘솔 발급 promotionCode와 1인 누적 한도(5,000원)를
 * 백엔드 없이 검증할 수 없다. 이 앱은 금전 보상을 다루지 않는다.
 * @see grantRewardDisabled — 호출 지점이 남아 있어도 SDK를 건드리지 않는 no-op
 */
const PROMOTION_REWARD_PATTERN = /grantPromotionReward\s*\(/;

/**
 * 인스톨 유도 문구 금지 — 미니앱은 네이티브 앱을 내려받으라고 권할 수 없다.
 * 금지어 6종: 앱을 ○○ / 내려받기 / ○○하기 / 상점에서 / 두 앱마켓 이름.
 *
 * 금지어를 통째로 적으면 이 파일이 스캐너에 스스로 걸리므로 조각을 이어 붙인다.
 * 합쳐진 결과만 정규식이 되고, 소스 텍스트에는 연속된 금지어가 남지 않는다.
 */
const INSTALL_PROMPT_PATTERN = new RegExp(
  [
    '앱' + '을?\\s*' + '설치',
    '다' + '운로드',
    '설치' + '하기',
    '스토어' + '에서',
    '[Aa]pp\\s*[Ss]tore',
    '[Gg]oogle\\s*[Pp]lay',
  ].join('|'),
);

/**
 * 외부 로깅/분석 솔루션 금지 — 검수 반려 사유.
 * 대체: SDK의 `Analytics.screen()` / `Analytics.click()`.
 */
const EXTERNAL_ANALYTICS_PATTERN = /google-analytics|gtag|amplitude|mixpanel|sentry|hotjar/i;

/** 외부 분석 패키지 이름 — package.json / index.html 감사용 */
export const EXTERNAL_ANALYTICS_PACKAGES: readonly string[] = [
  'google-analytics',
  'gtag',
  'amplitude',
  'mixpanel',
  'sentry',
  'hotjar',
];

/**
 * 검수에서 반려되는 소스 패턴 전체 목록.
 * 새 규칙이 생기면 여기에 추가하면 `findComplianceViolations`가 자동으로 검사한다.
 */
export const PROHIBITED_PATTERNS: readonly ComplianceRule[] = [
  {
    id: 'hex-color',
    description: 'HEX 색상 하드코딩 — 다크모드가 깨진다. TDS 색 토큰(var(--tds-color-*))을 쓴다.',
    pattern: HEX_COLOR_PATTERN,
  },
  {
    id: 'external-navigation',
    description: '외부 도메인 이탈 — 미니앱 흐름은 토스 앱 안에서 끝나야 한다.',
    pattern: EXTERNAL_NAVIGATION_PATTERN,
  },
  {
    id: 'blank-target',
    description: '새 탭 이탈 — WebView에는 탭이 없다.',
    pattern: BLANK_TARGET_PATTERN,
  },
  {
    id: 'promotion-reward',
    description: '프로모션 지급 API — 한도 검증 수단이 없어 사용하지 않는다.',
    pattern: PROMOTION_REWARD_PATTERN,
  },
  {
    id: 'install-prompt',
    description: '네이티브 앱 인스톨 유도 문구 — 검수 반려 사유.',
    pattern: INSTALL_PROMPT_PATTERN,
  },
  {
    id: 'external-analytics',
    description: '외부 로깅/분석 솔루션 — SDK Analytics만 허용된다.',
    pattern: EXTERNAL_ANALYTICS_PATTERN,
  },
];

/**
 * 소스 텍스트 한 덩어리에서 위반된 규칙 id를 모아 돌려준다.
 * 위반이 없으면 빈 배열 — 스캐너/게이트 스크립트에서 그대로 쓸 수 있다.
 */
export function findComplianceViolations(source: string): ComplianceRuleId[] {
  return PROHIBITED_PATTERNS.filter((rule) => rule.pattern.test(source)).map((rule) => rule.id);
}

/**
 * UI 문구 한 줄이 금지 표현(설치 유도 / 외부 이탈 흔적)을 담고 있는지 확인한다.
 * 색상·분석 규칙은 문구 검사 대상이 아니므로 제외한다.
 */
export function isProhibitedCopy(text: string): boolean {
  return INSTALL_PROMPT_PATTERN.test(text) || BLANK_TARGET_PATTERN.test(text);
}

/**
 * 광고 설정(그룹 ID + 슬롯 ID)이 env로 주입됐는지 확인한다.
 *
 * 앱인토스 콘솔에서 발급받은 값이 둘 다 있어야 광고를 붙일 수 있다.
 * 하나라도 없으면 광고 래퍼는 **조용히 숨겨야** 한다 — 빈 회색 박스나
 * "광고 준비 중" 문구가 남으면 검수에서 미완성으로 본다.
 */
export function hasAdConfig(): boolean {
  return import.meta.env.VITE_TOSS_AD_GROUP_ID && import.meta.env.VITE_TOSS_AD_SLOT_ID ? true : false;
}

/**
 * 광고 래퍼(AdSlot 등)를 렌더할지 판단한다.
 * 슬롯별 id가 넘어오면 그 값이 비어 있지 않은지도 함께 본다 — undefined인 id로
 * SDK를 호출하면 WebView 안에서 빈 배너 자리만 남는다.
 */
export function shouldRenderAd(slotIdentifier?: string | null): boolean {
  if (slotIdentifier !== undefined && slotIdentifier !== null) {
    return slotIdentifier.trim().length > 0;
  }
  return hasAdConfig();
}

/** 프로모션 지급 기능 사용 여부 — 이 앱은 금전 보상을 다루지 않는다. */
export const PROMOTION_REWARDS_ENABLED = false;

/** `grantRewardDisabled`의 반환값 — 항상 실패로 취급된다. */
export interface DisabledRewardResult {
  ok: false;
  reason: 'promotion-disabled';
}

/**
 * 프로모션 지급의 방어적 no-op.
 *
 * 보상 지급 경로가 실수로 되살아나더라도 SDK를 건드리지 않고 즉시 실패를 돌려준다.
 * 호출부는 반환값의 `ok`가 항상 false임을 전제로 UI를 만들면 된다 —
 * 예외를 내보내지 않으므로 렌더 트리가 무너지지 않는다.
 */
export async function grantRewardDisabled(): Promise<DisabledRewardResult> {
  return { ok: false, reason: 'promotion-disabled' };
}
