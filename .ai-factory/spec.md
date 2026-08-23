# SPEC — ScoreClimb

> 매일 미션을 수행하며 신용점수를 게임처럼 올리는 습관 트래커 (앱인토스 미니앱)

---

## Common Principles

### 기술 원칙
| 항목 | 결정 |
|---|---|
| 빌드 | Vite + React + TypeScript |
| UI | TDS(`@toss/tds-mobile`) 단독. shadcn/MUI/Ant/Chakra 금지 |
| 라우팅 | `react-router-dom` (BrowserRouter) |
| 저장소 | localStorage 전용 (`src/lib/storage.ts` 헬퍼 사용), 서버 없음 |
| 인증 | 토스 세션 자동. 로그인 함수 호출 없음. 필요 시 `getIsTossLoginIntegratedService()`로 연동 여부만 확인 |
| 광고 | 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 보상형 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` |
| 결제 | 사용 안 함 (수익모델 = 광고) |
| 하단 탭 | 템플릿 제공 `src/components/FloatingTabBar` (TDS에 TabBar 없음) |
| 간격 | TDS `Spacing size={...}`만 사용. TDS 컴포넌트에 Tailwind/inline padding·margin 덮어쓰기 금지 |
| 색상 | `var(--tds-color-*)` 또는 TDS 컴포넌트만. HEX 하드코딩 금지 (다크모드 필수) |
| AI | **본 앱은 생성형 AI를 사용하지 않는다.** 시뮬레이션·리포트는 코드에 박힌 결정론적 규칙(F6 산식)으로만 계산되며, 동일 입력 → 동일 출력이다. 따라서 AI 고지 배너/라벨은 두지 않는다 |

### 공통 정책 AC (전역 — 모든 화면에 적용)

- **AC-G1 [U][P0]**: Scenario: 결정론적 계산
  - Given 동일한 `SimulationInput` 객체
  - When `simulate(input)`를 100회 호출
  - Then 100회 모두 동일한 `SimulationResult`를 반환하고, 코드베이스 어디에도 LLM/생성형 AI 호출이 존재하지 않음

- **AC-G2 [W][P0]**: Scenario: 외부 도메인 이탈 차단
  - Given 앱이 실행 중일 때
  - When 소스 전체를 검사
  - Then `window.location.href = 'http(s)://…'`, `window.open(...)`, `target="_blank"` 외부 링크가 0건이고, 모든 화면 이동은 `navigate()`로만 수행됨

- **AC-G3 [W][P0]**: Scenario: 앱 설치 유도 금지
  - Given 프로덕션 빌드 산출물
  - When 텍스트를 검사
  - Then "앱을 설치", "다운로드", "설치하기", "스토어에서" 문구가 0건임

- **AC-G4 [U][P0]**: Scenario: 콘솔 에러 0개
  - Given `vite build` 후 프리뷰 실행
  - When 온보딩→홈→미션→시뮬레이션→결과→리포트 전체 플로우를 1회 순회
  - Then `console.error` 호출이 0회임

- **AC-G5 [W][P0]**: Scenario: HEX 색상 하드코딩 금지
  - Given `src/**/*.{ts,tsx,css}` 전체
  - When `#[0-9a-fA-F]{3,8}` 정규식으로 검색
  - Then 매칭이 0건이고, 색상은 전부 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값임

- **AC-G6 [W][P0]**: Scenario: 외부 로깅/분석 도구 금지
  - Given `package.json`과 `index.html`
  - When 의존성과 스크립트 태그를 검사
  - Then `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry`, `hotjar` 문자열이 0건임

- **AC-G7 [U][P0]**: Scenario: Android 7 / iOS 16 호환
  - Given `vite.config.ts` 빌드 타깃
  - When 빌드 산출물을 검사
  - Then `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `Array.prototype.findLast`, 옵셔널 체이닝 미트랜스파일 코드가 번들에 0건이고, target은 `['es2019','safari13']`로 설정됨

- **AC-G8 [U][P1]**: Scenario: CORS 에러 0개
  - Given 앱이 외부 API를 호출하지 않는 구조일 때
  - When 네트워크 탭을 확인
  - Then 앱 자체 정적 자산 외 cross-origin 요청이 0건이고 CORS 에러 로그가 0건임

- **AC-G9 [U][P0]**: Scenario: 프로모션 리워드 미사용
  - Given MVP 범위
  - When 소스에서 `grantPromotionReward`를 검색
  - Then 호출이 0건임 (향후 도입 시 `amount ≤ 5000` 가드 필수 — Open Questions Q4)

- **AC-G10 [U][P1]**: Scenario: 최소 터치 타깃
  - Given 모든 화면의 탭 가능한 요소(Button, ListRow, Chip, Switch, FloatingTabBar 아이템)
  - When 렌더링된 박스 높이를 측정
  - Then 모든 요소의 높이가 44px 이상임

- **AC-G11 [S][P1]**: Scenario: 저장소 쓰기 실패 방어
  - Given localStorage 쿼터가 가득 차 `setItem`이 `QuotaExceededError`를 던지는 상태
  - When 어떤 저장 동작이든 수행
  - Then 앱이 크래시하지 않고 TDS Toast로 "저장 공간이 부족해요. 오래된 기록을 정리했어요"를 표시하고, 90일 이전 데이터를 삭제한 뒤 1회 재시도함

- **AC-G12 [W][P1]**: Scenario: 손상된 저장 데이터 복구
  - Given `localStorage['scoreclimb.profile.v1']`에 `"{{broken"` 문자열이 들어있을 때
  - When 앱을 실행
  - Then JSON 파싱 실패를 catch하여 해당 키를 기본값으로 초기화하고, 흰 화면 없이 온보딩 화면(`/onboarding`)이 렌더링됨

---

## Data Models

### CreditProfile — 사용자 신용 현황
| 필드 | 타입 | 제약 |
|---|---|---|
| score | number | 정수, 350–1000 (KCB 스케일) |
| birthYear | number | 정수, 1960–2010 |
| cardUsageRatio | number | 정수, 0–100 (%) |
| loanCount | number | 정수, 0–10 |
| updatedAt | string | ISO 8601 |

```ts
export interface CreditProfile {
  score: number;
  birthYear: number;
  cardUsageRatio: number;
  loanCount: number;
  updatedAt: string;
}
```

### ScoreSnapshot — 점수 추이 기록
```ts
export interface ScoreSnapshot {
  date: string;   // 'YYYY-MM-DD'
  score: number;  // 350~1000
}
```
제약: 배열 최대 90개(FIFO). 같은 `date`가 이미 있으면 덮어쓴다.

### MissionDefinition — 미션 정의(코드 상수, 저장 안 함)
```ts
export type MissionCategory = 'card' | 'payment' | 'debt' | 'info';
export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  points: number; // 1~3
}
```
고정 6종 (총 12점):
| id | title | category | points |
|---|---|---|---|
| `m_card_usage` | 카드 사용률 30% 이하 유지 | card | 3 |
| `m_no_late` | 오늘 연체 없음 확인 | payment | 3 |
| `m_auto_pay` | 자동이체 계좌 잔액 확인 | payment | 2 |
| `m_no_cash_advance` | 현금서비스·리볼빙 미사용 | debt | 2 |
| `m_score_check` | 신용점수 변동 확인 | info | 1 |
| `m_debt_plan` | 부채 상환 계획 점검 | debt | 1 |

### DailyMissionLog — 일별 미션 수행 기록
```ts
export interface DailyMissionLog {
  date: string;                 // 'YYYY-MM-DD'
  completedMissionIds: string[];// MissionDefinition.id 부분집합
  totalPoints: number;          // 0~12, 완료 미션 points 합
}
export type MissionLogMap = Record<string, DailyMissionLog>;
```
제약: 최대 180일치 보관, 초과 시 오래된 날짜부터 삭제.

### StreakState — 연속 출석
```ts
export interface StreakState {
  current: number;               // 0 이상
  longest: number;               // 0 이상
  lastCompletedDate: string|null;// 'YYYY-MM-DD'
  totalCompletedMissions: number;// 누적 완료 미션 수
}
```
"출석 성공" 판정: 해당 날짜의 `completedMissionIds.length >= 3`.

### BadgeState — 배지 획득
```ts
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  condition: { type: 'streak'|'totalMissions'|'simulation'; value: number };
}
export interface BadgeState {
  unlockedBadgeIds: string[];
  unlockedAt: Record<string, string>; // badgeId → ISO 8601
}
```
고정 6종:
| id | name | condition |
|---|---|---|
| `b_first` | 첫걸음 | totalMissions ≥ 1 |
| `b_streak3` | 사흘의 힘 | streak ≥ 3 |
| `b_streak7` | 일주일 클리어 | streak ≥ 7 |
| `b_streak30` | 한 달 마스터 | streak ≥ 30 |
| `b_mission50` | 미션 50 | totalMissions ≥ 50 |
| `b_simulator` | 미래 설계자 | simulation ≥ 1 |

### SimulationInput / SimulationResult
```ts
export interface SimulationInput {
  currentScore: number;        // 350~1000
  cardUsageRatio: number;      // 0~100
  onTimePaymentMonths: number; // 0~24
  newLoanCount: number;        // 0~5
}
export type FactorDirection = 'up' | 'down' | 'flat';
export interface SimulationFactor {
  label: string;
  impact: number;              // 점수 가감분(정수)
  direction: FactorDirection;
}
export interface SimulationResult {
  input: SimulationInput;
  predictedScore: number;      // 350~1000
  delta: number;               // predictedScore - currentScore
  monthlyProjection: number[]; // 길이 6, 각 350~1000
  factors: SimulationFactor[]; // 길이 4
  createdAt: string;           // ISO 8601
}
```

### PeerBenchmark — 또래 기준값(코드 상수, 앱 자체 산정 참고값)
```ts
export interface PeerBenchmark {
  band: '20-24'|'25-29'|'30-34'|'35-39'|'40+';
  avgScore: number;
  avgCardUsageRatio: number;
}
```
| band | avgScore | avgCardUsageRatio |
|---|---|---|
| 20-24 | 720 | 42 |
| 25-29 | 780 | 38 |
| 30-34 | 830 | 34 |
| 35-39 | 860 | 31 |
| 40+ | 875 | 29 |

### AppFlags
```ts
export interface AppFlags {
  onboardingDone: boolean;
  disclaimerAckedAt: string | null; // ISO 8601, 참고값 고지 확인
}
```

---

## Feature List

### F1. 데이터 계층 & localStorage 저장소

- **Description**: 위 7개 모델의 TypeScript 타입, 기본값, 읽기/쓰기/마이그레이션 함수를 `src/lib/`에 구현한다. 모든 읽기는 스키마 검증을 거쳐 손상 데이터를 기본값으로 복구하고, 모든 쓰기는 쿼터 초과를 catch해 오래된 데이터를 정리 후 재시도한다. UI 코드는 이 계층만 통해 저장소에 접근한다.
- **Data**: CreditProfile, ScoreSnapshot[], MissionLogMap, StreakState, BadgeState, SimulationResult, AppFlags
- **API**: 없음 (localStorage 전용)
- **Requirements**: `storage.get<T>(key, fallback)`, `storage.set<T>(key, value)`, `pruneOldData()`, `zod` 없이 수동 타입가드 사용

- **AC-1 [U][P0]**: Scenario: 키 네임스페이스 고정
  - Given 저장소 모듈이 로드될 때
  - Then 사용되는 키는 정확히 `scoreclimb.profile.v1`, `scoreclimb.scoreHistory.v1`, `scoreclimb.missionLogs.v1`, `scoreclimb.streak.v1`, `scoreclimb.badges.v1`, `scoreclimb.lastSimulation.v1`, `scoreclimb.flags.v1` 7개이고 그 외 키를 쓰지 않음

- **AC-2 [E][P0]**: Scenario: 프로필 저장/조회 왕복
  - Given 빈 localStorage일 때
  - When `saveProfile({ score: 820, birthYear: 1996, cardUsageRatio: 45, loanCount: 1 })` 호출
  - Then `scoreclimb.profile.v1`에 `updatedAt`이 ISO 문자열로 채워져 저장되고
  - And `loadProfile()`이 `score === 820`, `birthYear === 1996`인 객체를 반환함

- **AC-3 [W][P1]**: Scenario: 범위를 벗어난 값 거부
  - Given 저장 함수 호출
  - When `saveProfile({ score: 1200, birthYear: 1996, cardUsageRatio: 45, loanCount: 1 })`
  - Then 저장하지 않고 `{ ok: false, error: '점수는 350~1000 사이여야 해요' }`를 반환함

- **AC-4 [W][P1]**: Scenario: 손상 JSON 복구
  - Given `localStorage['scoreclimb.streak.v1'] = 'null}}'`
  - When `loadStreak()` 호출
  - Then 예외를 던지지 않고 `{ current: 0, longest: 0, lastCompletedDate: null, totalCompletedMissions: 0 }`를 반환하고 해당 키를 기본값으로 덮어씀

- **AC-5 [S][P1]**: Scenario: 쿼터 초과 시 정리 후 재시도
  - Given `setItem`이 첫 호출에서 `QuotaExceededError`를 던지는 상태
  - When `saveMissionLog(...)` 호출
  - Then `pruneOldData()`가 실행되어 `missionLogs` 중 90일 이전 항목과 `scoreHistory` 중 60일 이전 항목이 삭제되고, `setItem`을 1회 재시도하며, 재시도도 실패하면 `{ ok: false, error: '저장 공간이 부족해요' }`를 반환함

- **AC-6 [U][P1]**: Scenario: 최초 실행 빈 상태
  - Given localStorage가 완전히 비어 있을 때
  - When `loadFlags()`, `loadMissionLogs()`, `loadBadges()` 호출
  - Then 각각 `{ onboardingDone: false, disclaimerAckedAt: null }`, `{}`, `{ unlockedBadgeIds: [], unlockedAt: {} }`를 반환하고 localStorage에 쓰기가 발생하지 않음

- **AC-7 [U][P1]**: Scenario: 보관 상한
  - Given `missionLogs`에 200일치 데이터가 있을 때
  - When `saveMissionLog`로 새 날짜를 추가
  - Then 저장 후 `Object.keys(missionLogs).length === 180`이고 가장 오래된 21일치가 삭제됨

---

### F2. 온보딩 & 신용 현황 입력

- **Description**: 최초 실행 시 신용점수·출생연도·카드 사용률·대출 건수를 입력받아 `CreditProfile`을 생성한다. 토스 앱이 신용점수를 앱으로 직접 전달하는 SDK API가 없으므로(Open Questions Q1) 사용자가 토스 앱에서 확인한 점수를 직접 입력하며, 입력값이 참고용임을 명시 고지한다. 이후 홈에서 언제든 재입력할 수 있다.
- **Data**: CreditProfile, ScoreSnapshot[], AppFlags
- **API**: 없음
- **Requirements**: TDS TextField(numeric keyboard), TDS Button, TDS Paragraph.Text, TDS AlertDialog

- **AC-1 [E][P0]**: Scenario: 온보딩 입력 성공
  - Given `flags.onboardingDone === false`이고 `/onboarding` 화면일 때
  - When `{ score: 820, birthYear: 1996, cardUsageRatio: 45, loanCount: 1 }` 입력 후 "시작하기" 탭
  - Then `CreditProfile`이 저장되고, 오늘 날짜의 `ScoreSnapshot { date: 오늘, score: 820 }`이 `scoreHistory`에 추가되며, `flags.onboardingDone = true`로 저장되고 `navigate('/', { replace: true })`로 이동함

- **AC-2 [S][P0]**: Scenario: 온보딩 완료자 재진입 차단
  - Given `flags.onboardingDone === true`일 때
  - When 앱을 실행하거나 `/onboarding`으로 직접 진입
  - Then 즉시 `navigate('/', { replace: true })`가 실행되어 온보딩 폼이 렌더링되지 않음

- **AC-3 [W][P1]**: Scenario: 점수 범위 밖 입력 거부
  - Given `/onboarding` 화면일 때
  - When `score: 1500` 입력 후 "시작하기" 탭
  - Then 저장되지 않고 점수 TextField 하단에 "신용점수는 350~1000 사이로 입력해주세요"가 표시되며 화면 이동이 발생하지 않음

- **AC-4 [W][P1]**: Scenario: 빈 필수값 거부
  - Given `/onboarding` 화면일 때
  - When `score` 필드를 비운 채 "시작하기" 탭
  - Then "신용점수를 입력해주세요"가 표시되고 "시작하기" 버튼은 `disabled` 상태를 유지함

- **AC-5 [E][P1]**: Scenario: 참고값 고지 1회 표시
  - Given `flags.disclaimerAckedAt === null`이고 온보딩 첫 진입일 때
  - Then TDS AlertDialog에 "ScoreClimb의 점수·또래 평균은 앱 자체 기준의 참고값이며 실제 신용평가사 결과와 다를 수 있어요"가 1회 표시되고
  - When "확인" 탭
  - Then `flags.disclaimerAckedAt`에 ISO 시각이 저장되고 이후 실행에서 다시 표시되지 않음

- **AC-6 [U][P1]**: Scenario: 모바일 키보드 대응
  - Given `/onboarding`의 4개 TextField
  - Then 모두 `inputMode="numeric"`, `pattern="[0-9]*"`이고, 포커스 시 하단 "시작하기" 버튼이 키보드에 가려지지 않도록 폼 컨테이너가 `scrollIntoView({ block: 'center' })`로 해당 필드를 노출함

- **AC-7 [S][P1]**: Scenario: 저장 중 로딩
  - Given "시작하기"를 탭해 저장이 진행 중일 때
  - Then 버튼이 `loading` 상태로 바뀌고 `disabled`가 되어 중복 제출이 불가능하며, 저장 완료 후 로딩이 해제됨

---

### F3. 홈 대시보드 (신용점수 현황)

- **Description**: 현재 신용점수를 히어로 숫자로 보여주고, 최근 30일 추이 Sparkline, 오늘 미션 진행률, 현재 스트릭을 한 화면에 요약한다. 각 요약 카드는 해당 상세 화면으로 이동하는 진입점 역할을 한다. 배너 광고는 요약 카드 아래 독립 섹션에 배치해 콘텐츠를 가리지 않는다.
- **Data**: CreditProfile, ScoreSnapshot[], DailyMissionLog(오늘), StreakState
- **API**: 없음
- **Requirements**: ScreenScaffold, SummaryHero(CountUp), Sparkline, Card, TDS ListRow, TDS Button, AdSlot, FloatingTabBar

- **AC-1 [U][P0]**: Scenario: 홈 히어로 표시
  - Given `profile.score === 820`일 때
  - When `/`에 진입
  - Then `data-testid="score-hero"`인 SummaryHero가 0→820으로 CountUp 애니메이션 후 "820점"을 표시하고, 하단에 "전일 대비 +5점" 형식의 변화량이 표시됨(직전 스냅샷 없으면 "첫 기록" 표시)

- **AC-2 [U][P0]**: Scenario: 홈 레이아웃 계약
  - Given `/` 화면이 렌더링될 때
  - Then 루트는 `ScreenScaffold`이고, `data-testid="summary-card"`인 Card가 정확히 3개(추이 / 오늘 미션 / 스트릭) 존재하며, 각 Card 안의 핵심 값은 TDS Typography `t2`~`t3` 크기로 강조됨

- **AC-3 [E][P0]**: Scenario: 카드 탭 내비게이션
  - Given `/` 화면일 때
  - When `data-testid="summary-card-mission"` Card를 탭
  - Then `navigate('/missions')`가 호출되어 미션 화면으로 이동함

- **AC-4 [S][P1]**: Scenario: 추이 데이터 부족 시 빈 상태
  - Given `scoreHistory.length <= 1`일 때
  - Then Sparkline 대신 `Asset.ContentIcon`과 "기록이 2일 이상 쌓이면 추이를 보여드려요" 텍스트가 `data-testid="trend-empty"`로 표시되고, Sparkline 요소는 DOM에 없음

- **AC-5 [S][P1]**: Scenario: 초기 로딩 스켈레톤
  - Given localStorage 읽기가 진행 중인 첫 렌더 프레임일 때
  - Then 3개 Card 위치에 `data-testid="home-skeleton"` 스켈레톤이 표시되고, 읽기 완료 후 실제 값으로 대체되며 레이아웃 점프(높이 변화)가 발생하지 않음

- **AC-6 [W][P1]**: Scenario: 프로필 없음 방어
  - Given `flags.onboardingDone === true`이지만 `profile`이 `null`인 상태(수동 삭제 등)
  - When `/`에 진입
  - Then 크래시 없이 `navigate('/onboarding', { replace: true })`로 이동함

- **AC-7 [U][P1]**: Scenario: 배너 광고 배치
  - Given `/` 화면일 때
  - Then `<AdSlot>`은 3번째 Card 아래 독립 섹션(`data-testid="home-ad"`)에 렌더링되고, Card 영역과 겹치지 않으며(`position: static`), 상하로 `Spacing size={16}`이 적용됨

- **AC-8 [E][P1]**: Scenario: 점수 수정
  - Given `/` 화면의 "점수 업데이트" TDS Button을 탭했을 때
  - When BottomSheet에서 `score: 835` 입력 후 저장
  - Then `profile.score = 835`로 갱신되고 오늘 날짜 `ScoreSnapshot`이 835로 덮어써지며, 히어로 숫자가 820→835로 재애니메이션됨

---

### F4. 데일리 미션 체크리스트

- **Description**: 고정 6종 미션을 오늘 날짜 기준 체크리스트로 표시하고, 체크/해제 시 즉시 `DailyMissionLog`를 갱신한다. 진행률 바와 획득 점수를 상단에 고정 노출하며, 자정이 지나면 목록이 자동으로 초기화된다. 미션 목록 중간에 배너 광고 1개를 삽입한다.
- **Data**: MissionDefinition(상수), DailyMissionLog, StreakState
- **API**: 없음
- **Requirements**: ScreenScaffold, TDS ListRow + TDS Switch, MiniBar(진행률), AdSlot

- **AC-1 [E][P0]**: Scenario: 미션 체크 저장
  - Given 오늘 `completedMissionIds === []`일 때
  - When `m_card_usage`의 TDS Switch를 ON으로 탭
  - Then `missionLogs[오늘] = { date: 오늘, completedMissionIds: ['m_card_usage'], totalPoints: 3 }`으로 저장되고, 상단 진행률이 "1/6 · 3점"으로 갱신되며 TDS Toast "미션 완료! +3점"이 표시됨

- **AC-2 [E][P0]**: Scenario: 미션 해제
  - Given 오늘 `completedMissionIds === ['m_card_usage','m_no_late']`, `totalPoints === 6`일 때
  - When `m_no_late` Switch를 OFF로 탭
  - Then `completedMissionIds === ['m_card_usage']`, `totalPoints === 3`으로 저장되고 Toast는 표시되지 않음

- **AC-3 [E][P0]**: Scenario: 출석 성공 임계 도달
  - Given 오늘 완료 미션이 2개일 때
  - When 3번째 미션을 체크
  - Then F5의 스트릭 갱신 로직이 호출되고 `streak.lastCompletedDate === 오늘`이 됨

- **AC-4 [S][P0]**: Scenario: 날짜 변경 시 초기화
  - Given `missionLogs`에 어제 날짜 로그만 존재하고 오늘 로그가 없을 때
  - When `/missions`에 진입
  - Then 6개 미션 Switch가 모두 OFF로 렌더링되고 진행률은 "0/6 · 0점"이며, 어제 로그는 삭제되지 않고 보존됨

- **AC-5 [U][P1]**: Scenario: 리스트 렌더링 계약
  - Given `/missions` 화면일 때
  - Then 루트는 `ScreenScaffold`, 미션 항목은 TDS ListRow 6개(`data-testid="mission-row"`)이고 각 행 높이는 44px 이상이며, 우측 액세서리는 TDS Switch임(TDS에 Toggle 없음). ListRow에 padding prop이나 인라인 스타일 여백을 주지 않음

- **AC-6 [U][P1]**: Scenario: 목록 중간 광고
  - Given `/missions` 화면일 때
  - Then `<AdSlot>`이 3번째와 4번째 ListRow 사이에 `data-testid="mission-ad"`로 1개만 삽입되고, 광고가 ListRow를 덮거나 스크롤을 가로채지 않음

- **AC-7 [W][P1]**: Scenario: 저장 실패 시 UI 롤백
  - Given `saveMissionLog`가 `{ ok: false }`를 반환하는 상태
  - When 미션 Switch를 ON으로 탭
  - Then Switch가 0.5초 내 OFF로 되돌아가고 Toast "저장에 실패했어요. 다시 시도해주세요"가 표시되며 진행률은 변하지 않음

- **AC-8 [S][P1]**: Scenario: 전부 완료 상태
  - Given 6개 미션이 모두 체크되어 `totalPoints === 12`일 때
  - Then 상단에 `data-testid="mission-complete"` 배지와 "오늘 미션 올클리어! 12점" 문구가 표시되고, MiniBar 진행률이 100%로 표시됨

---

### F5. 스트릭 & 배지

- **Description**: 하루 3개 이상 미션 완료를 "출석 성공"으로 판정해 연속 일수를 계산하고, 최장 기록과 누적 완료 미션 수를 관리한다. 6종 배지의 해금 조건을 매 갱신마다 평가해 새로 해금된 배지를 다이얼로그로 알린다. 별도 화면(`/badges`)에서 획득/미획득 배지를 그리드로 보여준다.
- **Data**: StreakState, BadgeState, DailyMissionLog
- **API**: 없음
- **Requirements**: ScreenScaffold, SummaryHero, Card, TDS Chip, TDS AlertDialog, Asset.ContentIcon

- **AC-1 [E][P0]**: Scenario: 연속 일수 증가
  - Given `streak = { current: 4, longest: 6, lastCompletedDate: 어제, totalCompletedMissions: 20 }`일 때
  - When 오늘 3번째 미션을 체크
  - Then `streak = { current: 5, longest: 6, lastCompletedDate: 오늘, totalCompletedMissions: 21 }`로 저장됨

- **AC-2 [E][P0]**: Scenario: 하루 건너뛰면 리셋
  - Given `streak = { current: 9, longest: 9, lastCompletedDate: '2일 전' }`일 때
  - When 오늘 3번째 미션을 체크
  - Then `streak.current === 1`, `streak.longest === 9`, `lastCompletedDate === 오늘`이 됨

- **AC-3 [U][P0]**: Scenario: 같은 날 중복 증가 방지
  - Given `streak.lastCompletedDate === 오늘`, `current === 5`일 때
  - When 4·5·6번째 미션을 추가로 체크
  - Then `streak.current`는 5로 유지되고 `totalCompletedMissions`만 3 증가함

- **AC-4 [E][P0]**: Scenario: 배지 해금 알림
  - Given `badges.unlockedBadgeIds === ['b_first']`이고 `streak.current`가 2→3이 될 때
  - Then `b_streak3`이 `unlockedBadgeIds`에 추가되고 `unlockedAt['b_streak3']`에 ISO 시각이 저장되며, TDS AlertDialog에 "새 배지 획득: 사흘의 힘"이 1회 표시됨

- **AC-5 [U][P0]**: Scenario: 배지 화면 레이아웃 계약
  - Given `/badges` 화면일 때
  - Then 루트는 `ScreenScaffold`, 상단에 `data-testid="streak-hero"` SummaryHero가 `current` 값을 CountUp으로 표시하고, `data-testid="badge-card"` Card가 정확히 6개 렌더링되며 미획득 배지는 `opacity: 0.4`와 "잠김" TDS Chip을 가짐

- **AC-6 [S][P1]**: Scenario: 배지 0개 빈 상태
  - Given `unlockedBadgeIds === []`일 때
  - Then 그리드 위에 `Asset.ContentIcon`과 "오늘 미션 1개만 완료해도 첫 배지를 받아요" 문구가 `data-testid="badge-empty"`로 표시됨

- **AC-7 [W][P1]**: Scenario: 시스템 날짜 역행 방어
  - Given `streak.lastCompletedDate === '2026-08-30'`(미래 날짜)이고 오늘이 `2026-08-24`일 때
  - When 스트릭 갱신이 호출됨
  - Then `current`를 감소시키지 않고 1로 재설정하며 `lastCompletedDate === '2026-08-24'`로 덮어쓰고 콘솔 에러를 출력하지 않음

- **AC-8 [S][P1]**: Scenario: 로딩 상태
  - Given `/badges` 진입 직후 저장소 읽기 프레임일 때
  - Then 6개 Card 자리에 `data-testid="badge-skeleton"` 스켈레톤이 표시되고 이후 실제 배지로 교체됨

---

### F6. 점수 개선 시뮬레이션 (입력 + 계산 엔진)

- **Description**: 카드 사용률, 연체 없는 개월 수, 신규 대출 건수를 입력받아 6개월 뒤 예상 점수를 결정론적 규칙으로 계산한다. 계산 결과는 저장 후 결과 화면으로 전달하며, 결과 열람은 F7의 보상형 광고 게이트를 통과해야 한다. 계산 로직은 순수 함수로 분리해 단위 테스트가 가능해야 한다.
- **Data**: SimulationInput, SimulationResult, CreditProfile, StreakState
- **API**: 없음
- **Requirements**: ScreenScaffold, TDS TextField, TDS Chip(프리셋), SubmitFooter, 순수 함수 `simulate()`

**계산 산식 (고정)**
```
usageDelta   = ratio <= 30 ? +18 : ratio <= 50 ? +6 : ratio <= 70 ? -10 : -25
paymentDelta = min(onTimePaymentMonths, 12) * 3            // 0 ~ 36
loanDelta    = newLoanCount * -12                          // 0 ~ -60
streakBonus  = round(min(streak.current, 30) * 0.5)        // 0 ~ 15
predictedScore = clamp(currentScore + usageDelta + paymentDelta + loanDelta + streakBonus, 350, 1000)
delta = predictedScore - currentScore
monthlyProjection[i] = clamp(currentScore + round(delta * (i+1) / 6), 350, 1000)  // i = 0..5
factors = [카드 사용률, 연체 없는 기간, 신규 대출, 미션 스트릭] 4개
```

- **AC-1 [E][P0]**: Scenario: 시뮬레이션 계산 정확성
  - Given `streak.current === 10`일 때
  - When `simulate({ currentScore: 820, cardUsageRatio: 25, onTimePaymentMonths: 6, newLoanCount: 1 })` 호출
  - Then `predictedScore === 820 + 18 + 18 - 12 + 5 === 849`, `delta === 29`, `monthlyProjection === [825, 830, 835, 839, 844, 849]`, `factors.length === 4`를 반환함

- **AC-2 [E][P0]**: Scenario: 상한 클램프
  - When `simulate({ currentScore: 995, cardUsageRatio: 10, onTimePaymentMonths: 24, newLoanCount: 0 })` 호출 (streak 0)
  - Then `predictedScore === 1000`이고 `monthlyProjection`의 모든 값이 1000 이하임

- **AC-3 [E][P0]**: Scenario: 시뮬레이션 제출 후 이동
  - Given `/simulate` 화면에서 `{ cardUsageRatio: 25, onTimePaymentMonths: 6, newLoanCount: 1 }` 입력 후
  - When SubmitFooter의 "결과 보기" 버튼 탭
  - Then `SimulationResult`가 `scoreclimb.lastSimulation.v1`에 저장되고, `b_simulator` 배지 해금 평가가 실행되며, `navigate('/simulate/result', { state: { result: SimulationResult } })`가 호출됨

- **AC-4 [W][P1]**: Scenario: 범위 밖 입력 거부
  - Given `/simulate` 화면일 때
  - When `cardUsageRatio: 150` 입력 후 "결과 보기" 탭
  - Then 계산이 실행되지 않고 "카드 사용률은 0~100 사이로 입력해주세요"가 필드 하단에 표시되며 화면 이동이 없음

- **AC-5 [W][P1]**: Scenario: 프로필 미존재 시 계산 차단
  - Given `profile === null`일 때
  - When `/simulate`에 진입
  - Then 폼 대신 "먼저 신용점수를 입력해주세요" 안내와 "점수 입력하러 가기" TDS Button이 표시되고, 탭 시 `navigate('/onboarding')`으로 이동함

- **AC-6 [U][P1]**: Scenario: 입력 화면 레이아웃 계약
  - Given `/simulate` 화면일 때
  - Then 루트는 `ScreenScaffold`이고, 1차 액션 "결과 보기"는 하단 고정 `SubmitFooter` 안에 `display="block"` TDS Button으로 렌더링되며(좌측 글자폭 버튼 금지) 높이 48px 이상임

- **AC-7 [S][P1]**: Scenario: 계산 중 로딩
  - Given "결과 보기"를 탭한 직후
  - Then 버튼이 `loading` + `disabled`로 전환되어 중복 탭이 무시되고, 계산·저장 완료 후에만 라우팅이 1회 발생함

- **AC-8 [U][P1]**: Scenario: 키보드 대응 및 프리셋
  - Given `/simulate`의 3개 TextField
  - Then 모두 `inputMode="numeric"`이고, 카드 사용률 필드 위에 TDS Chip 프리셋 "10% / 30% / 50% / 80%" 4개가 제공되어 탭 시 해당 값이 입력되며, 키보드 오픈 시 SubmitFooter가 키보드 위로 밀려 가려지지 않음

---

### F7. 시뮬레이션 결과 (보상형 광고 게이트)

- **Description**: `TossRewardAd`로 결과를 게이팅하여, 사용자가 짧은 광고를 시청한 뒤 예상 점수·6개월 추이·요인별 기여도를 확인한다. 결과는 히어로 숫자 + Sparkline(6개월 추이) + 요인 Card 목록으로 구성한다. 광고 로드 실패 시에도 사용자가 막히지 않도록 결과를 열람할 수 있어야 한다.
- **Data**: SimulationResult
- **API**: 없음
- **Requirements**: ScreenScaffold, TossRewardAd, SummaryHero(CountUp), Sparkline, MiniBar, Card, TDS Chip, AdSlot(배너)

- **AC-1 [E][P0]**: Scenario: 결과 보기 전 보상형 광고
  - Given 사용자가 시뮬레이션 제출 후 `/simulate/result`에 도착했을 때
  - When `TossRewardAd` 광고 시청이 완료됨
  - Then 게이팅된 결과 영역(`data-testid="sim-result"`)이 렌더링되고 예상 점수 히어로가 표시됨

- **AC-2 [S][P0]**: Scenario: 광고 시청 전 잠금 상태
  - Given `/simulate/result`에 진입했고 광고를 아직 시청하지 않았을 때
  - Then `data-testid="sim-result"` 요소가 DOM에 존재하지 않고, "광고 보고 결과 확인하기" TDS Button(높이 48px 이상)과 "짧은 광고 시청 후 결과가 열려요" 안내만 표시됨

- **AC-3 [U][P0]**: Scenario: 결과 화면 레이아웃 계약
  - Given 광고 시청 완료 후 결과가 표시될 때
  - Then `data-testid="sim-hero"` SummaryHero가 `predictedScore`를 CountUp으로 표시하고 `delta`가 "+29점" 형식 TDS Chip으로 강조되며, `data-testid="factor-card"` Card가 정확히 4개 존재하고 각 Card는 MiniBar로 `impact` 비율을 시각화함

- **AC-4 [U][P0]**: Scenario: 6개월 추이 시각화
  - Given `monthlyProjection === [825, 830, 835, 839, 844, 849]`일 때
  - Then `data-testid="sim-sparkline"` Sparkline이 6개 데이터 포인트로 렌더링되고, 좌우 끝에 "이번 달 820점", "6개월 뒤 849점" 라벨이 표시됨

- **AC-5 [W][P1]**: Scenario: 광고 로드 실패 폴백
  - Given `TossRewardAd`가 로드 실패(onError) 상태일 때
  - Then Toast "광고를 불러오지 못했어요. 결과를 바로 보여드릴게요"가 표시되고 3초 내 결과 영역이 광고 없이 렌더링되어 사용자가 차단되지 않음

- **AC-6 [W][P1]**: Scenario: state 없이 직접 진입
  - Given `location.state`가 `undefined`인 채 `/simulate/result`로 직접 진입했을 때
  - When `scoreclimb.lastSimulation.v1`에 저장된 결과가 있으면 그 값을 사용하고, 없으면
  - Then `navigate('/simulate', { replace: true })`로 이동하며 크래시하지 않음

- **AC-7 [S][P1]**: Scenario: 광고 로딩 상태
  - Given "광고 보고 결과 확인하기"를 탭해 광고를 불러오는 중일 때
  - Then 버튼이 `loading` + `disabled`가 되고 "광고를 불러오는 중이에요" 문구가 표시되며, 중복 탭이 무시됨

- **AC-8 [U][P1]**: Scenario: 결과 하단 배너
  - Given 결과가 표시된 상태일 때
  - Then `<AdSlot>`이 마지막 factor Card 아래 `data-testid="result-ad"`로 배치되고 결과 콘텐츠와 겹치지 않으며, 그 아래 "다시 시뮬레이션" TDS Button(`display="block"`)이 위치함

---

### F8. 또래 평균 비교 리포트

- **Description**: 출생연도로 산출한 연령대의 앱 자체 기준값과 내 점수·카드 사용률을 비교해 순위 문구와 격차를 보여준다. 비교 결과에 따라 F4의 미션 중 우선 실행할 항목 2개를 추천한다. 모든 수치는 공식 통계가 아닌 참고값임을 화면에 상시 고지한다.
- **Data**: CreditProfile, PeerBenchmark(상수), MissionDefinition
- **API**: 없음
- **Requirements**: ScreenScaffold, Card, MiniBar(비교 막대), SummaryHero, TDS Paragraph.Text, AdSlot

- **AC-1 [U][P0]**: Scenario: 연령대 산출
  - Given 오늘이 `2026-08-24`이고 `birthYear === 1996`일 때
  - When `/report`에 진입
  - Then 나이는 30으로 계산되어 `band === '30-34'`, `avgScore === 830`이 비교 기준으로 사용됨

- **AC-2 [U][P0]**: Scenario: 비교 결과 표시
  - Given `profile.score === 820`, `band avgScore === 830`일 때
  - Then `data-testid="peer-hero"`에 "또래 평균보다 10점 낮아요"가 표시되고, `data-testid="peer-bar"` MiniBar 2개(내 점수 820 / 또래 830)가 나란히 렌더링됨

- **AC-3 [U][P0]**: Scenario: 리포트 레이아웃 계약
  - Given `/report` 화면일 때
  - Then 루트는 `ScreenScaffold`이고 `data-testid="report-card"` Card가 정확히 2개(점수 비교 / 카드 사용률 비교) 존재하며, 각 Card의 핵심 격차 값은 TDS Typography `t3` 이상 크기로 강조됨

- **AC-4 [E][P0]**: Scenario: 추천 미션 도출
  - Given `profile.cardUsageRatio === 62`이고 `band avgCardUsageRatio === 34`일 때
  - Then 추천 미션 영역(`data-testid="recommended-mission"`)에 `m_card_usage`와 `m_no_cash_advance` 2개가 ListRow로 표시되고, 탭 시 `navigate('/missions')`로 이동함

- **AC-5 [U][P0]**: Scenario: 참고값 상시 고지
  - Given `/report` 화면일 때
  - Then 화면 하단에 "또래 평균은 ScoreClimb 자체 기준의 참고값이며 신용평가사 공식 통계가 아니에요" 문구가 TDS Paragraph.Text로 항상 표시됨(스크롤해야 보이더라도 DOM에 상시 존재)

- **AC-6 [W][P1]**: Scenario: 연령대 범위 밖 처리
  - Given `birthYear === 2015`로 계산된 나이가 20 미만일 때
  - Then 예외 없이 `band === '20-24'` 기준값을 사용하고 "20대 초반 기준으로 비교했어요" 안내를 추가 표시함

- **AC-7 [W][P1]**: Scenario: 프로필 없음 빈 상태
  - Given `profile === null`일 때
  - When `/report`에 진입
  - Then `Asset.ContentIcon`과 "점수를 입력하면 또래와 비교해드려요" 문구, "점수 입력하기" TDS Button(`display="block"`)이 표시되고 비교 Card는 렌더링되지 않음

- **AC-8 [S][P1]**: Scenario: 로딩 상태
  - Given `/report` 진입 직후 저장소 읽기 프레임일 때
  - Then `data-testid="report-skeleton"` 스켈레톤이 2개 Card 자리에 표시되고, 읽기 완료 후 실제 비교 값으로 대체됨

---

## Screen Definitions

### S1. 온보딩 — `/onboarding`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F2 |
| 골격 | `ScreenScaffold` (raw div 골격 금지) |
| TDS 컴포넌트 | TDS Top(타이틀 "신용점수를 알려주세요"), TDS TextField ×4, TDS Paragraph.Text(안내), TDS AlertDialog(참고값 고지), TDS Button(SubmitFooter 내부, `display="block"`) |
| 1차 액션 | 하단 고정 `SubmitFooter` > "시작하기" 버튼, 높이 48px |
| 로딩 상태 | 저장 중 버튼 `loading` + `disabled` |
| 빈 상태 | 해당 없음(입력 화면) |
| 에러 상태 | 필드별 인라인 에러 텍스트: "신용점수는 350~1000 사이로 입력해주세요" / "출생연도는 1960~2010 사이로 입력해주세요" / "카드 사용률은 0~100 사이로 입력해주세요" / "대출 건수는 0~10 사이로 입력해주세요" |
| 키보드 | 전 필드 `inputMode="numeric"`, 포커스 시 `scrollIntoView({block:'center'})`, SubmitFooter는 키보드 위로 리프트 |
| 터치 타깃 | TextField 높이 ≥ 52px, Button ≥ 48px, AlertDialog 확인 ≥ 44px |
| data-testid | `onboarding-form`, `field-score`, `field-birthyear`, `field-usage`, `field-loan`, `onboarding-submit`, `disclaimer-dialog` |
| **Outgoing** | "시작하기" → `navigate('/', { replace: true })` — state 없음 |
| **Incoming** | `location.state`: 없음 (`undefined` 허용) |

### S2. 홈 대시보드 — `/`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F3 |
| 골격 | `ScreenScaffold` + 하단 `FloatingTabBar`(홈/미션/시뮬/리포트) |
| TDS 컴포넌트 | TDS Top, Card ×3, TDS ListRow(카드 내부 행), TDS Chip(전일 대비 변화량), TDS Button("점수 업데이트"), TDS BottomSheet(점수 수정), TDS TextField, TDS Toast |
| 표현 | `SummaryHero`(CountUp, 현재 점수), `Sparkline`(최근 30일 추이), `MiniBar`(오늘 미션 진행률) |
| 로딩 상태 | `data-testid="home-skeleton"` — Card 3개 자리 스켈레톤, 레이아웃 점프 0 |
| 빈 상태 | 추이 데이터 ≤1개: `Asset.ContentIcon` + "기록이 2일 이상 쌓이면 추이를 보여드려요" (`trend-empty`) |
| 에러 상태 | 프로필 로드 실패 → `/onboarding`로 replace 이동 |
| 스크롤 | 세로 단순 스크롤(항목 ≤ 10개, 가상 스크롤 불필요) |
| 광고 | `<AdSlot>` — 3번째 Card 아래 독립 섹션(`home-ad`), 상하 `Spacing size={16}`, 콘텐츠와 미중첩 |
| 터치 타깃 | Card 전체 탭 영역 ≥ 72px, FloatingTabBar 아이템 ≥ 48px |
| data-testid | `score-hero`, `summary-card`(×3), `summary-card-trend`, `summary-card-mission`, `summary-card-streak`, `home-ad`, `home-skeleton`, `trend-empty` |
| **Outgoing** | 미션 Card → `navigate('/missions')` (state 없음) / 스트릭 Card → `navigate('/badges')` (state 없음) / 추이 Card → `navigate('/report')` (state 없음) |
| **Incoming** | `location.state`: 없음 |

### S3. 미션 체크리스트 — `/missions`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F4 |
| 골격 | `ScreenScaffold` + `FloatingTabBar` |
| TDS 컴포넌트 | TDS Top("오늘의 미션"), TDS ListRow ×6 (우측 액세서리 = TDS Switch), TDS Chip(카테고리), TDS Toast, TDS Paragraph.Text |
| 표현 | `MiniBar` 진행률(0~12점), 상단 고정 요약 "3/6 · 7점" |
| 로딩 상태 | `mission-skeleton` — ListRow 6개 스켈레톤 |
| 빈 상태 | 미션은 항상 6개 고정이므로 목록 빈 상태 없음. 대신 미완료 0개 상태에서 "오늘 미션 올클리어! 12점" 배지(`mission-complete`) 표시 |
| 에러 상태 | 저장 실패 시 Switch 롤백 + Toast "저장에 실패했어요. 다시 시도해주세요" |
| 스크롤 | 6개 고정 목록 — 가상 스크롤 불필요. 상단 진행률 영역은 `position: sticky` |
| 광고 | `<AdSlot>` — 3번째/4번째 ListRow 사이(`mission-ad`) 1개만 |
| 터치 타깃 | ListRow ≥ 56px, Switch 히트 영역 ≥ 44px |
| data-testid | `mission-row`(×6, `data-mission-id` 속성 포함), `mission-progress`, `mission-ad`, `mission-complete`, `mission-skeleton` |
| **Outgoing** | 없음(탭바 이동만) |
| **Incoming** | `location.state`: 없음 |

### S4. 스트릭 & 배지 — `/badges`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F5 |
| 골격 | `ScreenScaffold` + `FloatingTabBar` |
| TDS 컴포넌트 | TDS Top("나의 기록"), Card ×6(배지 그리드), TDS Chip("잠김"/"획득"), TDS AlertDialog(신규 해금), TDS Paragraph.Text |
| 표현 | `SummaryHero`(CountUp, 현재 연속 일수 "5일"), 부제에 "최장 9일 · 누적 미션 21개", 배지 그리드 2열 CSS grid(TDS 미제공 레이아웃이므로 커스텀 CSS 허용) |
| 로딩 상태 | `badge-skeleton` ×6 |
| 빈 상태 | 획득 0개: `Asset.ContentIcon` + "오늘 미션 1개만 완료해도 첫 배지를 받아요" (`badge-empty`) |
| 에러 상태 | 미래 날짜 감지 시 스트릭 1로 재설정, 콘솔 에러 없이 조용히 복구 |
| 스크롤 | 6개 고정 그리드 — 단순 스크롤 |
| 광고 | 없음(축하 경험 방해 방지) |
| 터치 타깃 | 배지 Card ≥ 96px, AlertDialog 확인 ≥ 44px |
| data-testid | `streak-hero`, `badge-card`(×6, `data-badge-id`), `badge-empty`, `badge-skeleton`, `badge-unlock-dialog` |
| **Outgoing** | "미션 하러 가기" TDS Button → `navigate('/missions')` (state 없음) |
| **Incoming** | `location.state`: 없음 |

### S5. 시뮬레이션 입력 — `/simulate`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F6 |
| 골격 | `ScreenScaffold` + `SubmitFooter` |
| TDS 컴포넌트 | TDS Top("점수 시뮬레이션"), TDS TextField ×3, TDS Chip ×4(사용률 프리셋 10/30/50/80%), TDS Paragraph.Text(안내), TDS Button(SubmitFooter, `display="block"`) |
| 1차 액션 | 하단 고정 SubmitFooter > "결과 보기" 버튼 (좌측 글자폭 버튼 금지) |
| 로딩 상태 | 제출 중 버튼 `loading` + `disabled`, 중복 탭 무시 |
| 빈 상태 | `profile === null`: "먼저 신용점수를 입력해주세요" + "점수 입력하러 가기" 버튼 (`simulate-empty`) |
| 에러 상태 | 필드 인라인 에러: "카드 사용률은 0~100 사이로 입력해주세요" / "연체 없는 개월 수는 0~24 사이로 입력해주세요" / "신규 대출 건수는 0~5 사이로 입력해주세요" |
| 키보드 | 전 필드 `inputMode="numeric"`, 포커스 시 SubmitFooter가 키보드 위로 리프트되어 가려지지 않음 |
| 터치 타깃 | Chip ≥ 44px, TextField ≥ 52px, 제출 버튼 ≥ 48px |
| data-testid | `simulate-form`, `field-usage-ratio`, `field-ontime-months`, `field-new-loan`, `preset-chip`(×4), `simulate-submit`, `simulate-empty` |
| **Outgoing** | "결과 보기" → `navigate('/simulate/result', { state: { result: SimulationResult } })` / "점수 입력하러 가기" → `navigate('/onboarding')` |
| **Incoming** | `location.state`: 없음 (`undefined` 허용) |

### S6. 시뮬레이션 결과 — `/simulate/result`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F7 |
| 골격 | `ScreenScaffold`, 결과 영역 전체를 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감쌈 |
| TDS 컴포넌트 | TDS Top(뒤로가기), TDS Button("광고 보고 결과 확인하기" / "다시 시뮬레이션", `display="block"`), Card ×4(요인), TDS Chip(delta "+29점"), TDS Toast, TDS Paragraph.Text |
| 표현 | `SummaryHero`(CountUp, `predictedScore`), `Sparkline`(6개월 `monthlyProjection`), `MiniBar`(요인별 impact 비율) |
| 게이팅 콘텐츠 | 예상 점수 히어로 + 6개월 추이 + 요인 4종 Card — 광고 시청 전 DOM에 미존재 |
| 로딩 상태 | 광고 로드 중 버튼 `loading` + "광고를 불러오는 중이에요" |
| 빈 상태 | state·저장 결과 모두 없음 → `/simulate`로 replace 이동 |
| 에러 상태 | 광고 실패 → Toast "광고를 불러오지 못했어요. 결과를 바로 보여드릴게요" 후 3초 내 결과 개방 |
| 스크롤 | 세로 스크롤, 요인 Card 4개 고정 |
| 광고 | 보상형: `TossRewardAd` 게이트 / 배너: `<AdSlot>` 마지막 요인 Card 아래(`result-ad`), 콘텐츠 미중첩 |
| 터치 타깃 | 모든 Button ≥ 48px |
| data-testid | `sim-hero`, `sim-result`, `sim-sparkline`, `factor-card`(×4), `reward-gate-button`, `result-ad` |
| **Outgoing** | "다시 시뮬레이션" → `navigate('/simulate', { replace: true })` (state 없음) / "미션 하러 가기" → `navigate('/missions')` |
| **Incoming** | `location.state = { result: SimulationResult } \| undefined` — `undefined`면 `scoreclimb.lastSimulation.v1` fallback, 그것도 없으면 `/simulate` replace. **송신측(S5)과 타입 동일: `{ result: SimulationResult }`** |

### S7. 또래 비교 리포트 — `/report`
| 항목 | 내용 |
|---|---|
| 관련 기능 | F8 |
| 골격 | `ScreenScaffold` + `FloatingTabBar` |
| TDS 컴포넌트 | TDS Top("또래 비교"), Card ×2, TDS ListRow ×2(추천 미션), TDS Chip(연령대 밴드), TDS Paragraph.Text(참고값 고지), TDS Button |
| 표현 | `SummaryHero`("또래 평균보다 10점 낮아요"), `MiniBar` ×2쌍(내 점수 vs 또래 평균, 내 사용률 vs 또래 평균) |
| 로딩 상태 | `report-skeleton` — Card 2개 자리 스켈레톤 |
| 빈 상태 | `profile === null`: `Asset.ContentIcon` + "점수를 입력하면 또래와 비교해드려요" + "점수 입력하기" 버튼(`report-empty`) |
| 에러 상태 | 나이 < 20 → `20-24` 밴드 사용 + "20대 초반 기준으로 비교했어요" 안내 |
| 스크롤 | 세로 단순 스크롤 |
| 광고 | `<AdSlot>` — 추천 미션 ListRow 아래 최하단(`report-ad`), 고지 문구를 가리지 않음 |
| 터치 타깃 | ListRow ≥ 56px, Button ≥ 48px |
| data-testid | `peer-hero`, `report-card`(×2), `peer-bar`, `recommended-mission`(×2), `report-empty`, `report-skeleton`, `report-ad` |
| **Outgoing** | 추천 미션 ListRow → `navigate('/missions')` (state 없음) / "점수 입력하기" → `navigate('/onboarding')` |
| **Incoming** | `location.state`: 없음 |

### 라우팅 트리
```tsx
<BrowserRouter>
  <Routes>
    <Route path="/onboarding"      element={<OnboardingScreen />} />
    <Route path="/"                element={<HomeScreen />} />
    <Route path="/missions"        element={<MissionsScreen />} />
    <Route path="/badges"          element={<BadgesScreen />} />
    <Route path="/simulate"        element={<SimulateScreen />} />
    <Route path="/simulate/result" element={<SimulateResultScreen />} />
    <Route path="/report"          element={<ReportScreen />} />
    <Route path="*"                element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
```
`FloatingTabBar` 노출 라우트: `/`, `/missions`, `/simulate`, `/report`. 비노출: `/onboarding`, `/simulate/result`, `/badges`.

---

## Data Storage

전체 localStorage 사용량 목표: **< 300KB** (한도 5MB 대비 6% 미만)

| 키 | 타입 | 항목당 크기 | 최대 항목 | 최대 크기 |
|---|---|---|---|---|
| `scoreclimb.profile.v1` | `CreditProfile` | ~120 B | 1 | 0.12 KB |
| `scoreclimb.scoreHistory.v1` | `ScoreSnapshot[]` | ~32 B | 90 | 2.9 KB |
| `scoreclimb.missionLogs.v1` | `MissionLogMap` | ~140 B | 180 | 25.2 KB |
| `scoreclimb.streak.v1` | `StreakState` | ~110 B | 1 | 0.11 KB |
| `scoreclimb.badges.v1` | `BadgeState` | ~340 B | 1 | 0.34 KB |
| `scoreclimb.lastSimulation.v1` | `SimulationResult` | ~480 B | 1 | 0.48 KB |
| `scoreclimb.flags.v1` | `AppFlags` | ~70 B | 1 | 0.07 KB |
| **합계** | | | | **≈ 29.2 KB** |

데이터 형태 예시:
```jsonc
// scoreclimb.missionLogs.v1
{
  "2026-08-24": { "date": "2026-08-24", "completedMissionIds": ["m_card_usage","m_no_late","m_auto_pay"], "totalPoints": 8 }
}
// scoreclimb.streak.v1
{ "current": 5, "longest": 9, "lastCompletedDate": "2026-08-24", "totalCompletedMissions": 21 }
```

프루닝 규칙: `missionLogs` 180일 초과 시 오래된 날짜부터, `scoreHistory` 90개 초과 시 FIFO. 쿼터 초과 시 각각 90일/60일로 강제 축소 후 1회 재시도(AC-G11).

---

## API Contract

**외부 API 호출 없음.** MVP의 모든 데이터(신용점수 입력값, 미션 로그, 스트릭, 배지, 시뮬레이션 결과, 또래 기준값)는 로컬 계산 및 localStorage로 충족되며, 서버 코드와 외부 네트워크 요청을 전혀 두지 않는다. 따라서:

- Endpoint: 없음
- CORS 설정: 불필요 (AC-G8이 cross-origin 요청 0건을 검증)
- 통합 에러 형태(향후 외부 API 도입 시 계약): `{ error: string }`, HTTP 400 / 401 / 429 / 500

향후 기기 간 동기화가 필요해질 경우에만 별도 Railway API 서버를 설계한다(Open Questions Q2).

---

## Assumptions

1. **신용점수는 사용자 수동 입력**이다. 토스 미니앱 웹 프레임워크에서 신용점수를 직접 조회하는 공개 API가 확인되지 않았으므로, 사용자가 토스 앱에서 확인한 점수를 입력하는 방식으로 "연동 현황 대시보드"를 구현한다.
2. 점수 스케일은 **KCB 기준 350–1000점 정수**로 가정한다.
3. **또래 평균값(PeerBenchmark)은 앱 자체 산정 참고값**이며 공식 신용평가사 통계가 아니다. 모든 비교 화면에 이 사실을 상시 고지한다(F8 AC-5).
4. **시뮬레이션 산식은 결정론적 규칙**이며 실제 신용평가 모델이 아니다. 결과 화면에 "실제 평가 결과와 다를 수 있어요" 문구를 포함한다.
5. **미션 알림 푸시는 MVP 범위 밖**이다(플랫폼 규칙상 푸시 미지원). 대신 홈 대시보드의 미완료 미션 강조와 스트릭 위험 표시로 재방문 동기를 대체한다.
6. 토스 세션은 자동 제공되므로 **로그인 화면·로그인 호출을 만들지 않는다**. 사용자 식별이 필요해지면 `getIsTossLoginIntegratedService()`로 연동 여부만 확인한다.
7. 데이터는 **기기 로컬 저장**이므로 기기 변경·앱 데이터 삭제 시 기록이 소실된다. 온보딩 고지 다이얼로그에 이 사실을 1줄 포함한다.
8. 광고 그룹/슬롯 ID는 앱인토스 콘솔에서 발급받아 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID` 환경변수로 주입한다(재빌드 없이 교체 가능).
9. 날짜는 기기 로컬 타임존 기준 `YYYY-MM-DD`를 사용하며, 하루 경계는 로컬 자정이다.
10. 수익 추정(월 58만원)은 DAU·광고 단가 가정에 근거한 목표치이며 본 SPEC의 검증 대상이 아니다.

---

## Open Questions

| # | 질문 | 영향 | 미해결 시 기본 결정 |
|---|---|---|---|
| Q1 | 앱인토스에서 사용자 신용점수를 조회할 수 있는 공식 SDK API가 존재하는가? | F2·F3의 데이터 획득 방식 | 수동 입력 유지 (현재 SPEC 그대로) |
| Q2 | 기기 변경 시 기록 이관(동기화)이 MVP 필수인가? | 외부 API 서버 필요 여부 | localStorage 전용 유지, 동기화 미지원 |
| Q3 | "또래 평균" 표현이 검수에서 근거 자료를 요구받는가? | F8 문구 및 노출 가능 여부 | 문구를 "ScoreClimb 참고 기준"으로 유지 + 상시 고지 |
| Q4 | 초기 유저 확보용 프로모션 리워드(`grantPromotionReward`)를 집행할 것인가? | 신규 기능 1개 추가 | MVP 미사용 (AC-G9). 도입 시 `amount ≤ 5000` 가드 필수 |
| Q5 | 보상형 광고 게이트의 일일 노출 상한을 둘 것인가? | F7 UX·수익 | 상한 없음. 시뮬레이션 실행 시마다 1회 노출 |
| Q6 | 미션 6종을 사용자가 커스터마이즈할 수 있어야 하는가? | F4 범위 확대 | 고정 6종 유지 |
| Q7 | 점수 입력 주기 알림(인앱 배지 등)을 홈에 둘 것인가? | F3 추가 요소 | `updatedAt`이 7일 초과 시 홈 상단에 "점수를 업데이트해주세요" ListRow 1개 노출로 대체 |