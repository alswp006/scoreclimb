# TASK — ScoreClimb

> SPEC의 F1~F8 + 전역 AC(AC-G1~AC-G12)를 16개 작업 패킷으로 분해. 각 패킷은 10분 이내 완료 가능하며, 완료 시점마다 `tsc --noEmit` + `vite build`가 통과해야 한다.

---

## Epic 1. 타입 & 상수 (런타임 로직 없음)

Risk Assessment
- Complexity: Low
- Risk factors: (a) 타입만 정의하고 `RouteState`를 빠뜨리면 S5→S6 전달 계약이 페이지마다 제각각 재정의되어 런타임 `undefined` 크래시. (b) 미션/배지/벤치마크 상수를 페이지마다 중복 하드코딩하면 F4·F5·F8 값 불일치. (c) 스토리지 키 문자열이 흩어지면 F1-AC-1(키 7개 고정) 위반.
- Mitigation: Epic 1을 최우선 실행해 `RouteState`와 `STORAGE_KEYS`를 단일 소스로 확정하고, Epic 2·3의 모든 패킷이 이 파일만 import하도록 Depends on으로 강제.

### Task 1.1 데이터 모델 타입 + RouteState 정의
- Description: `src/lib/types.ts`에 SPEC Data Models 전체(`CreditProfile`, `ScoreSnapshot`, `MissionCategory`/`MissionDefinition`, `DailyMissionLog`/`MissionLogMap`, `StreakState`, `BadgeDefinition`/`BadgeState`, `SimulationInput`/`FactorDirection`/`SimulationFactor`/`SimulationResult`, `PeerBenchmark`, `AppFlags`)를 선언한다. 추가로 저장 함수 공통 반환 타입 `SaveResult = { ok: true } | { ok: false; error: string }`과 `RouteState`를 정의한다. 순수 타입 선언만 — 런타임 값/함수/enum 금지. `RouteState`는 다음과 같이 고정한다.
  ```ts
  export type RouteState = {
    "/onboarding": undefined;
    "/": undefined;
    "/missions": undefined;
    "/badges": undefined;
    "/simulate": undefined;
    "/simulate/result": { result: SimulationResult } | undefined;
    "/report": undefined;
  };
  ```
  파일 상단 주석에 "수신 측은 `as` 캐스팅 후 `?? null`로 null 체크 필수. `as`는 컴파일 타임 주장일 뿐 런타임 방어가 아니다"를 명시한다.
- DoD:
  - `src/lib/types.ts`가 존재하고 `tsc --noEmit` 통과, 빌드 산출물에 이 파일에서 유래한 런타임 코드가 0바이트(타입 전용).
  - `RouteState["/simulate/result"]`가 `{ result: SimulationResult } | undefined`로 정의되고, S5 송신 타입과 S6 수신 타입이 동일 심볼을 참조.
  - `score`/`birthYear`/`cardUsageRatio`/`loanCount` 등 숫자 필드에 허용 범위를 JSDoc(`/** 350~1000 */`)으로 표기.
  - 파일 내 `#[0-9a-fA-F]{3,8}` 매칭 0건.
- Covers: [AC-G-5]
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 고정 상수 테이블 + 스토리지 키 정의
- Description: `src/lib/constants.ts`에 코드 상수를 선언한다. ① `STORAGE_KEYS` — 정확히 7개 키(`scoreclimb.profile.v1`, `scoreclimb.scoreHistory.v1`, `scoreclimb.missionLogs.v1`, `scoreclimb.streak.v1`, `scoreclimb.badges.v1`, `scoreclimb.lastSimulation.v1`, `scoreclimb.flags.v1`)를 `as const`로. ② `MISSION_DEFINITIONS: MissionDefinition[]` 6종(points 합 12). ③ `BADGE_DEFINITIONS: BadgeDefinition[]` 6종. ④ `PEER_BENCHMARKS: PeerBenchmark[]` 5밴드. ⑤ 기본값 `DEFAULT_FLAGS`, `DEFAULT_STREAK`, `DEFAULT_BADGES`. ⑥ 상한 상수 `MAX_MISSION_LOG_DAYS = 180`, `MAX_SCORE_HISTORY = 90`, `PRUNE_MISSION_LOG_DAYS = 90`, `PRUNE_SCORE_HISTORY_DAYS = 60`.
- DoD:
  - `Object.values(STORAGE_KEYS).length === 7`이고 전부 `scoreclimb.` 접두사 + `.v1` 접미사이며, 그 외 키 문자열이 소스에 없음.
  - `MISSION_DEFINITIONS.length === 6`, `reduce((s,m)=>s+m.points,0) === 12`, id가 `m_card_usage`/`m_no_late`/`m_auto_pay`/`m_no_cash_advance`/`m_score_check`/`m_debt_plan`과 정확히 일치.
  - `BADGE_DEFINITIONS.length === 6`이고 조건이 `{type:'totalMissions',value:1}`, `{type:'streak',value:3}`, `{type:'streak',value:7}`, `{type:'streak',value:30}`, `{type:'totalMissions',value:50}`, `{type:'simulation',value:1}`.
  - `PEER_BENCHMARKS`가 `20-24:720/42`, `25-29:780/38`, `30-34:830/34`, `35-39:860/31`, `40+:875/29`.
  - `Array.prototype.at` / `Object.groupBy` / `structuredClone` / `findLast` 미사용.
- Covers: [F1-AC-1, AC-G-7]
- Files: [src/lib/constants.ts]
- Depends on: Task 1.1

---

## Epic 2. 데이터 계층 & 도메인 로직

Risk Assessment
- Complexity: Medium
- Risk factors: (a) 손상 JSON(`"{{broken"`)·쿼터 초과를 UI 레이어에서 처리하면 방어 코드가 화면마다 흩어져 흰 화면 발생(AC-G-12). (b) 스트릭 계산을 미션 화면에 인라인으로 넣으면 F5-AC-2/AC-3/AC-7(리셋·중복방지·미래날짜)이 단위 테스트 불가. (c) `simulate()`가 컴포넌트 안에 있으면 AC-G-1(100회 동일 출력)을 검증할 수 없음. (d) 날짜를 `new Date(str)`로 파싱하면 UTC 해석되어 자정 경계가 어긋남(Assumption 9).
- Mitigation: 저장소 코어(2.1) → 엔티티 CRUD(2.2) → 도메인 순수 함수(2.3~2.5) → 상태 훅(2.6) 순으로 계층을 분리해 각 계층이 아래 계층만 의존하게 한다. 날짜 유틸을 2.1에 두어 모든 계층이 동일한 로컬 `YYYY-MM-DD` 규칙을 쓰게 강제한다.

### Task 2.1 스토리지 코어 + 날짜 유틸 (get/set/prune/quota)
- Description: `src/lib/storage.ts`에 저수준 저장소 계층을 구현한다. ① `storage.get<T>(key, fallback, guard?)` — `JSON.parse` 실패나 타입가드 실패 시 예외를 던지지 않고 fallback 반환 + 해당 키를 fallback으로 덮어씀(단, 키가 애초에 없으면 쓰기 없음). ② `storage.set<T>(key, value): SaveResult` — `QuotaExceededError` catch → `pruneOldData()` → `setItem` 1회 재시도 → 실패 시 `{ ok:false, error:'저장 공간이 부족해요' }`. ③ `pruneOldData()` — `missionLogs` 90일 이전, `scoreHistory` 60일 이전 항목 삭제. ④ `src/lib/date.ts`에 `todayKey()`(로컬 타임존 `YYYY-MM-DD`), `parseDateKey`, `diffDays`, `addDays`. `console.error` 호출 금지(무음 복구).
- DoD:
  - `localStorage['scoreclimb.streak.v1'] = 'null}}'` 상태에서 `storage.get(KEY, DEFAULT_STREAK, isStreakState)` 호출 시 예외 없이 `{ current:0, longest:0, lastCompletedDate:null, totalCompletedMissions:0 }` 반환 + 해당 키가 기본값 JSON으로 덮어써짐.
  - 완전히 빈 localStorage에서 `storage.get`을 3회 호출해도 `setItem` 호출 0회.
  - `setItem`이 첫 호출에서 `QuotaExceededError`를 던지도록 모킹하면 `pruneOldData()`가 1회 실행되고 `setItem` 재시도가 정확히 1회 발생하며, 재시도도 실패하면 `{ok:false,error:'저장 공간이 부족해요'}` 반환(크래시 0건).
  - `todayKey()`가 로컬 자정 기준 `YYYY-MM-DD`를 반환하고 `toISOString()` 기반 UTC 변환을 쓰지 않음.
  - `src/lib/storage.ts`, `src/lib/date.ts`에 `console.error` 0건.
- Covers: [F1-AC-1, F1-AC-4, F1-AC-5, F1-AC-6, AC-G-11, AC-G-12]
- Files: [src/lib/storage.ts, src/lib/date.ts]
- Depends on: Task 1.2

### Task 2.2 엔티티 CRUD + 범위 검증 타입가드
- Description: `src/lib/repository.ts`에 엔티티별 로드/세이브 함수와 수동 타입가드(zod 미사용)를 구현한다. `loadProfile/saveProfile`, `loadScoreHistory/upsertSnapshot`, `loadMissionLogs/saveMissionLog`, `loadStreak/saveStreak`, `loadBadges/saveBadges`, `loadLastSimulation/saveLastSimulation`, `loadFlags/saveFlags`. 저장 함수는 범위 검증 후 위반 시 저장하지 않고 한국어 메시지를 담은 `SaveResult`를 반환한다. `saveProfile`은 `updatedAt`을 ISO로 채운다. `upsertSnapshot`은 같은 `date`가 있으면 덮어쓰고 90개 초과 시 FIFO. `saveMissionLog`는 저장 후 키가 180개를 넘으면 오래된 날짜부터 삭제한다.
- DoD:
  - `saveProfile({score:820,birthYear:1996,cardUsageRatio:45,loanCount:1})` → `{ok:true}`, `loadProfile()`이 `score===820 && birthYear===1996`이고 `updatedAt`이 `new Date(v).toString() !== 'Invalid Date'`인 ISO 문자열.
  - `saveProfile({score:1200,...})` → 저장 없이 정확히 `{ ok:false, error:'점수는 350~1000 사이여야 해요' }` 반환, `localStorage['scoreclimb.profile.v1']` 미변경.
  - 필드별 위반 메시지 문자열 일치: birthYear→`'출생연도는 1960~2010 사이여야 해요'`, cardUsageRatio→`'카드 사용률은 0~100 사이여야 해요'`, loanCount→`'대출 건수는 0~10 사이여야 해요'`.
  - `missionLogs`에 200일치를 심고 새 날짜 1개를 `saveMissionLog`로 추가 → `Object.keys(...).length === 180`, 가장 오래된 21개 키 삭제.
  - 빈 localStorage에서 `loadFlags()==={onboardingDone:false,disclaimerAckedAt:null}`, `loadMissionLogs()==={}`, `loadBadges()==={unlockedBadgeIds:[],unlockedAt:{}}`이고 `setItem` 호출 0회.
  - 오늘 항목이 있는 상태에서 `upsertSnapshot({date:오늘,score:835})` → 배열 길이 불변, 오늘 항목 score만 835.
- Covers: [F1-AC-2, F1-AC-3, F1-AC-6, F1-AC-7]
- Files: [src/lib/repository.ts]
- Depends on: Task 2.1

### Task 2.3 스트릭 & 배지 도메인 순수 함수
- Description: `src/lib/streak.ts`에 `computeStreak(prev: StreakState, todayCompletedCount: number, today: string): StreakState`를, `src/lib/badges.ts`에 `evaluateBadges(prev: BadgeState, ctx: { streak: number; totalMissions: number; simulationCount: number }, nowIso: string): { next: BadgeState; newlyUnlocked: BadgeDefinition[] }`를 구현한다. 출석 판정은 완료 미션 수 ≥ 3. 규칙: `lastCompletedDate === today`면 `current` 불변, 1일 차이면 `current+1`, 2일 이상이면 `current = 1`, `last`가 미래 날짜면 `current = 1`로 재설정하고 `lastCompletedDate = today`로 덮어쓰되 `console.error` 미호출. `longest = max(longest, current)`. `totalCompletedMissions`는 체크 이벤트당 +1(해제 시 감소 없음).
- DoD:
  - `computeStreak({current:4,longest:6,lastCompletedDate:어제,totalCompletedMissions:20}, 3, 오늘)` → `{current:5,longest:6,lastCompletedDate:오늘,totalCompletedMissions:21}`.
  - `{current:9,longest:9,lastCompletedDate:2일전}` + 오늘 3번째 체크 → `current===1`, `longest===9`, `lastCompletedDate===오늘`.
  - `lastCompletedDate===오늘, current:5`에서 3회 추가 호출 → `current`는 5 유지, `totalCompletedMissions`만 +3.
  - `lastCompletedDate:'2026-08-30'`, today `'2026-08-24'` → `current===1`, `lastCompletedDate==='2026-08-24'`, `console.error` 0회, 예외 0건.
  - `evaluateBadges({unlockedBadgeIds:['b_first'],unlockedAt:{...}}, {streak:3,totalMissions:n,simulationCount:0}, iso)` → `next.unlockedBadgeIds`에 `b_streak3` 포함, `next.unlockedAt['b_streak3']`이 ISO 문자열, `newlyUnlocked.length===1`, `newlyUnlocked[0].name==='사흘의 힘'`. 동일 인자 재호출 시 `newlyUnlocked.length===0`(멱등).
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-7]
- Files: [src/lib/streak.ts, src/lib/badges.ts]
- Depends on: Task 1.2

### Task 2.4 시뮬레이션 계산 엔진 simulate()
- Description: `src/lib/simulate.ts`에 SPEC F6 산식을 그대로 구현한 순수 함수 `simulate(input: SimulationInput, streakCurrent: number, nowIso: string): SimulationResult`를 작성한다. `usageDelta`(≤30:+18 / ≤50:+6 / ≤70:-10 / else:-25), `paymentDelta = min(months,12)*3`, `loanDelta = newLoanCount*-12`, `streakBonus = Math.round(min(streak,30)*0.5)`, `predictedScore = clamp(합, 350, 1000)`, `monthlyProjection[i] = clamp(currentScore + Math.round(delta*(i+1)/6), 350, 1000)`, `factors` 4개(카드 사용률 / 연체 없는 기간 / 신규 대출 / 미션 스트릭). LLM·네트워크·랜덤·현재시각 참조 금지(시각은 `nowIso` 인자로 주입).
- DoD:
  - `simulate({currentScore:820,cardUsageRatio:25,onTimePaymentMonths:6,newLoanCount:1}, 10, iso)` → `predictedScore===849`, `delta===29`, `monthlyProjection`이 정확히 `[825,830,835,839,844,849]`, `factors.length===4`.
  - `simulate({currentScore:995,cardUsageRatio:10,onTimePaymentMonths:24,newLoanCount:0}, 0, iso)` → `predictedScore===1000`, `monthlyProjection.every(v => v>=350 && v<=1000)`.
  - 동일 인자 100회 호출 시 `JSON.stringify` 결과 100개가 전부 동일.
  - `src/lib/simulate.ts`에 `fetch`/`Math.random`/무인자 `new Date()`/`anthropic`/`openai` 문자열 0건.
  - 각 factor의 `direction`이 `impact > 0 ? 'up' : impact < 0 ? 'down' : 'flat'`과 일치.
- Covers: [F6-AC-1, F6-AC-2, AC-G-1]
- Files: [src/lib/simulate.ts]
- Depends on: Task 1.2

### Task 2.5 또래 벤치마크 & 추천 미션 로직
- Description: `src/lib/peer.ts`에 ① `resolveBand(birthYear: number, today: string): { band: PeerBenchmark['band']; benchmark: PeerBenchmark; clampedFromYoung: boolean }` — 나이 = `todayYear - birthYear`, 20 미만이면 `20-24` 폴백 + `clampedFromYoung: true`. ② `comparePeer(profile, benchmark): { scoreDiff: number; usageDiff: number; headline: string }` — headline은 낮으면 `"또래 평균보다 N점 낮아요"`, 높으면 `"또래 평균보다 N점 높아요"`, 같으면 `"또래 평균과 같아요"`. ③ `recommendMissions(profile, benchmark): MissionDefinition[]` — 정확히 2개 반환(우선순위: 사용률 초과 → `m_card_usage`+`m_no_cash_advance`, 점수 미만 → `m_no_late`+`m_auto_pay`, 그 외 → `m_score_check`+`m_debt_plan`). ④ 고지 문구 상수 `PEER_DISCLAIMER = '또래 평균은 ScoreClimb 자체 기준의 참고값이며 신용평가사 공식 통계가 아니에요'`를 export해 F8 화면이 하드코딩 없이 재사용하게 한다.
- DoD:
  - `resolveBand(1996, '2026-08-24')` → `band==='30-34'`, `benchmark.avgScore===830`, `clampedFromYoung===false`.
  - `resolveBand(2015, '2026-08-24')` → 예외 없이 `band==='20-24'`, `benchmark.avgScore===720`, `clampedFromYoung===true`.
  - `comparePeer({score:820,...}, {avgScore:830,...}).headline === '또래 평균보다 10점 낮아요'`.
  - `recommendMissions({cardUsageRatio:62,...}, {avgCardUsageRatio:34,...})` → 길이 2, id가 `['m_card_usage','m_no_cash_advance']`.
  - 반환 미션은 항상 `MISSION_DEFINITIONS` 원소 참조(새 객체 생성 금지).
  - `PEER_DISCLAIMER` 문자열이 SPEC F8-AC-5 문구와 문자 단위로 일치하고, 조건부 분기 없이 항상 동일 값을 반환.
- Covers: [F8-AC-1, F8-AC-4, F8-AC-5, F8-AC-6]
- Files: [src/lib/peer.ts]
- Depends on: Task 1.2

### Task 2.6 앱 상태 훅 useAppData (로딩 플래그 포함)
- Description: `src/hooks/useAppData.ts` + `src/hooks/AppDataProvider.tsx`에 저장소를 1회 읽어 메모리 상태로 보유하는 경량 스토어를 구현한다. 노출 값: `{ loading, profile, scoreHistory, missionLogs, streak, badges, flags, pendingBadgeUnlocks, actions }`. `actions`: `updateProfile`, `toggleMission(missionId, on)`, `recordSimulation(result)`, `ackDisclaimer()`, `completeOnboarding(profile)`, `clearPendingBadges()`. `toggleMission`은 낙관적 업데이트 후 저장 실패(`ok:false`) 시 이전 상태로 롤백하고 실패 사유를 반환한다. `loading`은 최초 마운트 프레임에서 `true`, `useEffect` 첫 실행 후 `false`. 외부 네트워크 호출 없음.
- DoD:
  - Provider 마운트 직후 첫 렌더에서 `loading===true`, `useEffect` 완료 후 `loading===false`로 정확히 1회 전이(의존성 배열 `[]`, 무한 리렌더 없음).
  - `toggleMission('m_card_usage', true)` → `missionLogs[오늘].completedMissionIds===['m_card_usage']`, `totalPoints===3`, `saveMissionLog` 1회 호출.
  - `saveMissionLog`가 `{ok:false}`를 반환하도록 모킹하면 `toggleMission`이 `{ok:false,error:...}`를 반환하고 훅의 `missionLogs`가 호출 전 값과 deep-equal.
  - 완료 수가 3에 도달하면 `computeStreak`+`evaluateBadges`가 호출되고 `streak.lastCompletedDate===todayKey()`가 되며 `newlyUnlocked`가 `pendingBadgeUnlocks`로 노출.
  - 미션 해제(off) 시 `totalPoints`가 해당 미션 points만큼 감소하고 Toast 트리거 플래그를 반환하지 않음.
  - `flags.onboardingDone===true`인데 `profile===null`인 경우를 그대로 노출(리다이렉트 판단은 페이지 책임), 훅 내부 크래시 0건.
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-7, F5-AC-4]
- Files: [src/hooks/useAppData.ts, src/hooks/AppDataProvider.tsx]
- Depends on: Task 2.2, Task 2.3, Task 2.4

---

## Epic 3. UI 페이지

Risk Assessment
- Complexity: High
- Risk factors: (a) `ScreenScaffold`/`SummaryHero`/`Sparkline`/`MiniBar`/`Card`를 페이지마다 따로 만들면 레이아웃 계약 AC(F3-AC-2, F5-AC-5, F7-AC-3, F8-AC-3)가 화면별로 어긋남. (b) TDS 컴포넌트에 Tailwind/inline padding을 덮어쓰면 검수 반려. (c) `/simulate/result`에서 `location.state`를 null 체크 없이 구조분해하면 새로고침·직접진입 시 즉시 크래시(실사고 2026-08-03 SplitMate: 결과 배열 undefined로 `.map()` 크래시, 완주율 0%). (d) 보상형 광고 로드 실패 시 사용자가 결과에 영원히 접근 불가.
- Mitigation: Task 3.1에서 공용 프리미티브를 먼저 확정해 모든 페이지가 동일 계약을 재사용하고, 각 페이지 DoD에 "TDS 컴포넌트에 style/className 여백 미지정" 검사를 포함. state 수신 화면(3.7)에는 `?? null` → null 분기 DoD를 별도로 넣고 광고 실패 폴백(3초 내 개방)을 명시.

### Task 3.1 공용 UI 프리미티브
- Description: `src/components/`에 7개 표현 컴포넌트를 만든다. `ScreenScaffold`(TDS Top 슬롯 + 스크롤 본문 + 옵션 하단 슬롯), `SubmitFooter`(하단 고정, `env(safe-area-inset-bottom)` 반영, 키보드 오픈 시 리프트), `Card`(TDS 토큰 배경/보더, 탭 가능 시 높이 ≥72px), `SummaryHero`(CountUp, `prefers-reduced-motion` 존중), `Sparkline`(SVG 라인, 데이터 길이 ≥2일 때만 렌더), `MiniBar`(0~100% 가로 막대, `aria-valuenow` 노출), `SkeletonBlock`(고정 높이 플레이스홀더). 색상은 `var(--tds-color-*)`만, 커스텀 CSS는 flex/grid 배치와 SVG에만 허용.
- DoD:
  - 7개 파일이 존재하고 각각 `data-testid` prop을 그대로 DOM에 전달.
  - `SummaryHero value={820}` → 최종 표시 텍스트에 `820` 포함, `prefers-reduced-motion: reduce`에서는 애니메이션 없이 즉시 최종값.
  - `Sparkline`에 길이 1 배열을 주면 `null` 반환(DOM 미생성).
  - `src/components/**`에 `#[0-9a-fA-F]{3,8}` 매칭 0건.
  - TDS 요소 자체에 `style={{padding|margin}}`이나 className 여백 지정 0건이며, 간격은 TDS `Spacing size={...}`(size prop 항상 명시)만 사용.
  - 탭 가능한 `Card` 렌더 높이 ≥72px, `SubmitFooter` 내 버튼 높이 ≥48px.
- Covers: [AC-G-5, AC-G-10]
- Files: [src/components/ScreenScaffold.tsx, src/components/SubmitFooter.tsx, src/components/Card.tsx, src/components/SummaryHero.tsx, src/components/Sparkline.tsx, src/components/MiniBar.tsx, src/components/SkeletonBlock.tsx]
- Depends on: Task 1.1

### Task 3.2 S1 온보딩 화면 /onboarding
- Description: `src/pages/OnboardingScreen.tsx`를 구현한다. `ScreenScaffold` + TDS Top("신용점수를 알려주세요") + TDS TextField ×4(`field-score`, `field-birthyear`, `field-usage`, `field-loan`) + `SubmitFooter` 안 `display="block"` TDS Button("시작하기", `onboarding-submit`). 최초 진입 시 `flags.disclaimerAckedAt === null`이면 TDS AlertDialog(`disclaimer-dialog`)로 참고값 고지 + "기기 데이터 삭제 시 기록이 사라져요" 1줄을 표시하고 확인 시 `ackDisclaimer()`. 제출 시 검증 → `completeOnboarding()` → 오늘 스냅샷 upsert → `flags.onboardingDone = true` → `navigate('/', { replace: true })`. `flags.onboardingDone === true`면 마운트 즉시 `<Navigate to="/" replace />`.
- DoD:
  - `{score:820,birthYear:1996,cardUsageRatio:45,loanCount:1}` 제출 → profile 저장, `scoreHistory`에 `{date: todayKey(), score:820}` 추가, `flags.onboardingDone===true`, `navigate('/',{replace:true})` 1회.
  - `flags.onboardingDone===true` 상태로 `/onboarding` 직접 진입 → `onboarding-form`이 DOM에 없고 `/`로 replace 이동.
  - `score:1500` 제출 → 저장 0회, `field-score` 하단에 정확히 `"신용점수는 350~1000 사이로 입력해주세요"`, 라우팅 0회. 나머지 3필드 에러 문구도 SPEC S1과 문자열 일치.
  - `score`가 빈 상태에서 `onboarding-submit`이 `disabled`이고, 탭 시 `"신용점수를 입력해주세요"` 표시.
  - 4개 TextField 모두 `inputMode="numeric"`, `pattern="[0-9]*"`, 포커스 시 `scrollIntoView({block:'center'})` 호출.
  - 제출 중 버튼이 `loading` + `disabled`이고 연속 3회 탭해도 저장 호출 1회.
  - `disclaimerAckedAt`가 ISO로 저장된 뒤 재마운트 시 `disclaimer-dialog` 미렌더.
  - `location.state` 미수신 — 직접 진입 크래시 0건.
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7]
- Files: [src/pages/OnboardingScreen.tsx]
- Depends on: Task 2.6, Task 3.1

### Task 3.3 S2 홈 대시보드 /
- Description: `src/pages/HomeScreen.tsx`를 구현한다. `SummaryHero`(`score-hero`, CountUp) + 전일 대비 변화량 TDS Chip + `summary-card` Card 3개(`summary-card-trend` / `summary-card-mission` / `summary-card-streak`) + `home-ad` 섹션의 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` + "점수 업데이트" TDS Button → TDS BottomSheet(TextField) 저장. `profile.updatedAt`이 7일 초과면 상단에 "점수를 업데이트해주세요" TDS ListRow 1개 노출(Q7 기본 결정). 로딩 프레임은 `home-skeleton`.
- DoD:
  - `profile.score===820`에서 `score-hero`가 CountUp 후 `"820점"` 표시, 직전 스냅샷 815면 `"전일 대비 +5점"`, 스냅샷 1개뿐이면 `"첫 기록"`.
  - 루트가 `ScreenScaffold`, `data-testid="summary-card"` 요소가 정확히 3개, 각 카드 핵심 값이 TDS Typography `t2`~`t3`.
  - `summary-card-mission` 탭 → `navigate('/missions')` 1회, `summary-card-streak` → `/badges`, `summary-card-trend` → `/report`.
  - `scoreHistory.length <= 1` → `trend-empty`(Asset.ContentIcon + `"기록이 2일 이상 쌓이면 추이를 보여드려요"`) 렌더, Sparkline 요소 DOM 0개.
  - `loading===true` 프레임에서 `home-skeleton` 표시, 실제 값 교체 전후 컨테이너 높이 차 0px.
  - `flags.onboardingDone===true && profile===null` → 크래시 없이 `/onboarding` replace.
  - `home-ad`가 3번째 Card 아래 형제 노드로 존재하고 `position: static`, 상하 `Spacing size={16}`.
  - BottomSheet에서 `835` 저장 → `profile.score===835`, 오늘 스냅샷 835 덮어쓰기, 히어로 820→835 재애니메이션.
  - `FloatingTabBar` 노출, 각 아이템 높이 ≥48px.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7, F3-AC-8]
- Files: [src/pages/HomeScreen.tsx]
- Depends on: Task 2.6, Task 3.1

### Task 3.4 S3 미션 체크리스트 /missions
- Description: `src/pages/MissionsScreen.tsx`를 구현한다. 상단 `position: sticky` 요약(`mission-progress`, "3/6 · 7점" + `MiniBar`), TDS ListRow 6개(`mission-row`, `data-mission-id`, 우측 액세서리 TDS Switch), 3번째와 4번째 ListRow 사이에 `<AdSlot>`(`mission-ad`) 1개. 체크 시 `actions.toggleMission` → 성공하면 TDS Toast `"미션 완료! +N점"`, 실패하면 Switch 롤백 + Toast `"저장에 실패했어요. 다시 시도해주세요"`. 해제 시 Toast 미표시. 6개 전부 완료 시 `mission-complete` 배지 + `"오늘 미션 올클리어! 12점"`. 로딩 프레임은 `mission-skeleton` 6개.
- DoD:
  - 오늘 로그 빈 상태에서 `m_card_usage` ON → `missionLogs[오늘]==={date:오늘,completedMissionIds:['m_card_usage'],totalPoints:3}`, `mission-progress` 텍스트 `"1/6 · 3점"`, Toast `"미션 완료! +3점"` 1회.
  - `['m_card_usage','m_no_late']`/6점 상태에서 `m_no_late` OFF → `completedMissionIds===['m_card_usage']`, `totalPoints===3`, Toast 호출 0회.
  - 완료 2개 상태에서 3번째 체크 → `streak.lastCompletedDate===todayKey()`로 갱신.
  - 어제 로그만 있는 상태로 진입 → 6개 Switch 전부 OFF, `mission-progress`가 `"0/6 · 0점"`, `missionLogs[어제]` 보존.
  - 루트가 `ScreenScaffold`, `mission-row` 정확히 6개, 각 행 높이 ≥56px, Switch 히트영역 ≥44px, ListRow에 padding prop/inline 여백 0건(TDS Toggle 미사용).
  - `mission-ad`가 정확히 1개이고 DOM 순서상 3번째와 4번째 `mission-row` 사이, `position: static`, 스크롤 가로채기 없음.
  - `saveMissionLog` 실패 모킹 시 Switch가 500ms 이내 OFF 복귀, `mission-progress` 불변, 실패 Toast 1회.
  - 6개 완료 시 `mission-complete` 렌더, MiniBar `aria-valuenow===100`.
  - `location.state` 미수신 — 직접 진입 크래시 0건.
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-8]
- Files: [src/pages/MissionsScreen.tsx]
- Depends on: Task 2.6, Task 3.1

### Task 3.5 S4 스트릭 & 배지 화면 /badges
- Description: `src/pages/BadgesScreen.tsx`를 구현한다. `ScreenScaffold` + TDS Top("나의 기록") + `SummaryHero`(`streak-hero`, `current` CountUp "5일", 부제 "최장 9일 · 누적 미션 21개") + 2열 CSS grid 배지 Card 6개(`badge-card`, `data-badge-id`). 미획득은 `opacity: 0.4` + "잠김" TDS Chip, 획득은 "획득" Chip. `pendingBadgeUnlocks`가 비어있지 않으면 TDS AlertDialog(`badge-unlock-dialog`)로 `"새 배지 획득: {name}"`을 1회 표시하고 확인 시 `clearPendingBadges()`. 획득 0개면 `badge-empty`. 로딩 프레임은 `badge-skeleton` 6개. 광고 없음. "미션 하러 가기" TDS Button → `navigate('/missions')`.
- DoD:
  - 루트가 `ScreenScaffold`, `streak-hero`가 `streak.current`를 CountUp으로 표시, `badge-card` 정확히 6개.
  - 미획득 Card의 computed `opacity === 0.4` + "잠김" Chip 포함, 획득 Card는 opacity 1.
  - `unlockedBadgeIds:['b_first']` 상태에서 `b_streak3` 신규 해금 시 `badge-unlock-dialog`에 `"새 배지 획득: 사흘의 힘"` 표시, 확인 후 재렌더 시 미표시.
  - `unlockedBadgeIds===[]` → 그리드 위에 `badge-empty`(Asset.ContentIcon + `"오늘 미션 1개만 완료해도 첫 배지를 받아요"`) 렌더.
  - `loading===true` 프레임에서 `badge-skeleton` 6개 표시 후 실제 Card로 교체.
  - `lastCompletedDate`가 미래 날짜인 상태로 진입해도 `console.error` 0회, 정상 렌더.
  - 이 화면에 `<AdSlot>`/`<TossRewardAd>` 0건, `FloatingTabBar` 미노출.
  - 배지 Card 높이 ≥96px, AlertDialog 확인 버튼 ≥44px.
  - `location.state` 미수신 — 직접 진입 크래시 0건.
- Covers: [F5-AC-4, F5-AC-5, F5-AC-6, F5-AC-8]
- Files: [src/pages/BadgesScreen.tsx]
- Depends on: Task 2.6, Task 3.1

### Task 3.6 S5 시뮬레이션 입력 /simulate
- Description: `src/pages/SimulateScreen.tsx`를 구현한다. `ScreenScaffold` + TDS Top("점수 시뮬레이션") + TDS Chip 프리셋 4개(`preset-chip`: 10/30/50/80%) + TDS TextField 3개(`field-usage-ratio`, `field-ontime-months`, `field-new-loan`) + `SubmitFooter` 안 `display="block"` TDS Button("결과 보기", `simulate-submit`). 제출 시 검증 → `simulate(input, streak.current, isoNow)` → `saveLastSimulation` → 시뮬레이션 배지 평가 → `navigate('/simulate/result', { state: { result } satisfies NonNullable<RouteState["/simulate/result"]> })`. `profile === null`이면 폼 대신 `simulate-empty` 빈 상태.
- DoD:
  - `{cardUsageRatio:25,onTimePaymentMonths:6,newLoanCount:1}` 제출 → `scoreclimb.lastSimulation.v1`에 `SimulationResult` 저장, `b_simulator` 해금 평가 1회, `navigate('/simulate/result',{state:{result}})` 1회 — 전달 객체 키가 `RouteState["/simulate/result"]`와 정확히 일치(`{ result }`).
  - `cardUsageRatio:150` 제출 → `simulate()` 호출 0회, `field-usage-ratio` 하단 `"카드 사용률은 0~100 사이로 입력해주세요"`, 라우팅 0회. 나머지 2필드 문구도 S5와 문자열 일치.
  - `profile===null` 진입 → `simulate-form` DOM 부재, `simulate-empty`에 `"먼저 신용점수를 입력해주세요"` + `display="block"` 버튼, 탭 시 `navigate('/onboarding')`.
  - 루트가 `ScreenScaffold`, `simulate-submit`이 `SubmitFooter` 내부 `display="block"` TDS Button이고 높이 ≥48px(글자폭 버튼 아님).
  - 제출 직후 버튼 `loading` + `disabled`, 연속 3회 탭해도 `navigate` 1회.
  - 3개 TextField 모두 `inputMode="numeric"`, `preset-chip` 4개 높이 각각 ≥44px, 탭 시 `field-usage-ratio` 값이 10/30/50/80으로 세팅.
  - 키보드 포커스 시 `SubmitFooter`가 뷰포트 내에 남아 버튼이 가려지지 않음.
  - `location.state` 미수신(`undefined` 허용) — 직접 진입 크래시 0건.
- Covers: [F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8]
- Files: [src/pages/SimulateScreen.tsx]
- Depends on: Task 2.6, Task 3.1

### Task 3.7 S6 시뮬레이션 결과 + 보상형 광고 게이트 /simulate/result
- Description: `src/pages/SimulateResultScreen.tsx`를 구현한다. state 수신 방어가 이 패킷의 핵심이다.
  ```ts
  const state = (useLocation().state as RouteState["/simulate/result"]) ?? null;
  const result = state?.result ?? loadLastSimulation();
  if (!result) return <Navigate to="/simulate" replace />;
  ```
  (`const { result } = useLocation().state as X` 및 `(useLocation().state as X).result.factors.map(...)` 금지.) 게이트 해제 전에는 `"광고 보고 결과 확인하기"` TDS Button(`reward-gate-button`)과 `"짧은 광고 시청 후 결과가 열려요"`만 표시. `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 결과 영역을 감싸고 시청 완료 시 `sim-result` 렌더. 결과 = `SummaryHero`(`sim-hero`) + delta TDS Chip + `Sparkline`(`sim-sparkline`) + `factor-card` Card 4개(각 `MiniBar`) + `<AdSlot>`(`result-ad`) + `"다시 시뮬레이션"` 버튼 + "실제 평가 결과와 다를 수 있어요" TDS Paragraph.Text.
- DoD:
  - state 없이 `/simulate/result`로 직접 진입(새로고침 포함)해도 크래시하지 않고, `lastSimulation`이 있으면 저장값을 렌더하고 없으면 `navigate('/simulate',{replace:true})` — 어느 경우에도 예외/흰 화면 0건.
  - 광고 시청 전: `document.querySelector('[data-testid="sim-result"]')`가 `null`이고 `reward-gate-button`(높이 ≥48px)과 안내 문구만 존재.
  - 광고 시청 완료 콜백 후 `sim-result` 렌더, `sim-hero`가 `predictedScore` CountUp, delta가 `"+29점"` 형식 TDS Chip.
  - `factor-card` 정확히 4개, 각 Card 안에 `MiniBar` 1개(`impact` 절대값 비율).
  - `monthlyProjection` 6개일 때 `sim-sparkline` 데이터 포인트 6개, 좌우 라벨 `"이번 달 820점"` / `"6개월 뒤 849점"`.
  - `TossRewardAd`의 `onError` 발생 시 Toast `"광고를 불러오지 못했어요. 결과를 바로 보여드릴게요"` 후 3초 이내 `sim-result`가 광고 없이 렌더.
  - 광고 로드 중 버튼 `loading` + `disabled` + `"광고를 불러오는 중이에요"` 표시, 중복 탭 시 로드 호출 1회.
  - `result-ad`가 마지막 `factor-card` 아래 형제 노드이고 콘텐츠와 미중첩, 그 아래 `display="block"` `"다시 시뮬레이션"` 버튼 → `navigate('/simulate',{replace:true})`.
  - `FloatingTabBar` 미노출.
- Covers: [F7-AC-1, F7-AC-2, F7-AC-3, F7-AC-4, F7-AC-5, F7-AC-6, F7-AC-7, F7-AC-8]
- Files: [src/pages/SimulateResultScreen.tsx]
- Depends on: Task 2.6, Task 3.1, Task 3.6

### Task 3.8 S7 또래 비교 리포트 /report
- Description: `src/pages/ReportScreen.tsx`를 구현한다. `ScreenScaffold` + TDS Top("또래 비교") + 밴드 TDS Chip + `SummaryHero`(`peer-hero`) + `report-card` Card 2개(점수 비교 / 카드 사용률 비교, 각 `peer-bar` `MiniBar` 2개) + `recommended-mission` TDS ListRow 2개 + 하단 `<AdSlot>`(`report-ad`) + `PEER_DISCLAIMER`를 조건 없이 렌더하는 TDS Paragraph.Text. `profile===null`이면 `report-empty`. 로딩 프레임은 `report-skeleton`.
- DoD:
  - `birthYear===1996`, 오늘 `2026-08-24` → 밴드 Chip `"30-34"`, 비교 기준 `avgScore===830` 사용.
  - `profile.score===820` → `peer-hero` 텍스트가 정확히 `"또래 평균보다 10점 낮아요"`, `peer-bar` MiniBar 2개(내 점수 820 / 또래 830) 나란히 렌더.
  - 루트가 `ScreenScaffold`, `report-card` 정확히 2개, 각 Card 격차 값이 TDS Typography `t3` 이상.
  - `cardUsageRatio===62`, 벤치마크 34 → `recommended-mission` ListRow 정확히 2개, `data-mission-id`가 `m_card_usage`, `m_no_cash_advance`, 탭 시 `navigate('/missions')`.
  - `"또래 평균은 ScoreClimb 자체 기준의 참고값이며 신용평가사 공식 통계가 아니에요"` 문구가 `PEER_DISCLAIMER`를 통해 화면 하단 DOM에 상시 존재(스크롤 여부·프로필 유무와 무관하게 조건부 렌더 금지)하고, `report-ad`가 이 문구를 덮지 않음.
  - `birthYear===2015` → 예외 없이 `20-24` 기준 사용 + `"20대 초반 기준으로 비교했어요"` 추가 표시.
  - `profile===null` → `report-card` 0개, `report-empty`에 Asset.ContentIcon + `"점수를 입력하면 또래와 비교해드려요"` + `display="block"` `"점수 입력하기"` 버튼 → `navigate('/onboarding')`.
  - `loading===true` 프레임에서 `report-skeleton`이 Card 2개 자리에 표시 후 실제 값으로 교체.
  - ListRow ≥56px, Button ≥48px. `location.state` 미수신 — 직접 진입 크래시 0건.
- Covers: [F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-5, F8-AC-6, F8-AC-7, F8-AC-8]
- Files: [src/pages/ReportScreen.tsx]
- Depends on: Task 2.5, Task 2.6, Task 3.1

---

## Epic 4. 통합 & 컴플라이언스

Risk Assessment
- Complexity: Medium
- Risk factors: (a) 빌드 타깃을 기본값으로 두면 `Array.prototype.at` 등이 번들에 남아 Android 7 / iOS 16에서 흰 화면(AC-G-7). (b) 부트 시점 `onboardingDone` 게이트가 없으면 신규 유저가 프로필 없는 홈으로 진입해 크래시. (c) 검수 반려 항목(HEX, 외부 링크, 설치 유도 문구, 외부 분석 SDK)은 페이지 단위로 흩어져 마지막 전수 검사 없이는 놓침. (d) `FloatingTabBar`를 잘못된 라우트에 노출하면 `/simulate/result` 보상형 게이트 UX가 깨짐.
- Mitigation: Epic 3까지 화면이 전부 존재한 뒤 라우팅 게이트(4.1)를 붙여 리다이렉트 루프를 실측 가능하게 하고, 마지막 4.2에서 정규식 전수 검사로 전역 AC를 한 번에 확정한다.

### Task 4.1 라우팅 트리 + 부트 게이트 + FloatingTabBar + 빌드 타깃
- Description: `src/App.tsx`에 SPEC 라우팅 트리를 그대로 구성한다(`/onboarding`, `/`, `/missions`, `/badges`, `/simulate`, `/simulate/result`, `/report`, `*` → `<Navigate to="/" replace />`). `AppDataProvider`로 전체를 감싸고 `loading` 중에는 라우팅 판단을 보류한다. 부트 게이트: `flags.onboardingDone === false`이면 어떤 경로로 진입해도 `/onboarding` replace, `flags.onboardingDone === true && profile === null`이면 `/onboarding` replace. `FloatingTabBar`는 `/`, `/missions`, `/simulate`, `/report`에서만 렌더. `vite.config.ts`의 `build.target`을 `['es2019','safari13']`로 설정한다.
- DoD:
  - 7개 라우트 + catch-all이 SPEC 트리와 일치하고 `/unknown` 진입 시 `/`로 replace.
  - 빈 localStorage로 `/report` 직접 진입 → `/onboarding` replace 1회, 리다이렉트 루프 없음.
  - `localStorage['scoreclimb.profile.v1'] = '{{broken'` 상태로 앱 실행 → 흰 화면 없이 `/onboarding` 렌더, 예외 0건.
  - `FloatingTabBar`가 `/`, `/missions`, `/simulate`, `/report`에서만 DOM에 존재하고 `/onboarding`, `/simulate/result`, `/badges`에서는 0개.
  - `vite.config.ts`에 `build: { target: ['es2019','safari13'] }`가 존재하고 `dist/assets/*.js`에 `.at(`, `Object.groupBy`, `structuredClone`, `.findLast(`, 미트랜스파일 `?.`/`??` 0건.
  - 온보딩→홈→미션→시뮬레이션→결과→리포트 1회 순회 시 라우팅 예외 0건.
- Covers: [AC-G-7, AC-G-12, F2-AC-2, F3-AC-6]
- Files: [src/App.tsx, src/main.tsx, vite.config.ts]
- Depends on: Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6, Task 3.7, Task 3.8

### Task 4.2 검수 컴플라이언스 전수 스윕
- Description: 코드베이스 전체를 정규식으로 훑어 검수 반려 요인을 제거하고 결과를 `docs/compliance-check.md`에 기록한다. 검사 항목: ① HEX 색상 → `var(--tds-color-*)` 치환. ② 외부 링크(`window.location.href='http'`, `window.open`, `target="_blank"`) 제거 — 모든 이동은 `navigate()`. ③ 앱 설치 유도 문구 제거. ④ 외부 분석/로깅 SDK 의존성·스크립트 제거. ⑤ `grantPromotionReward` 미사용 확인. ⑥ 생성형 AI 호출 문자열 미사용 확인. ⑦ 전체 플로우 순회 시 `console.error` 0회. ⑧ 탭 가능 요소 높이 ≥44px 실측. ⑨ cross-origin 요청 0건 확인. 또한 `.env.example`에 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`를 문서화한다.
- DoD:
  - `grep -rE '#[0-9a-fA-F]{3,8}' src --include='*.ts' --include='*.tsx' --include='*.css'` 결과 0건.
  - `grep -rE "window\.open|target=\"_blank\"|location\.href\s*=\s*['\"]https?:" src` 결과 0건.
  - `grep -rE '앱을 설치|다운로드|설치하기|스토어에서' src dist` 결과 0건.
  - `grep -rE 'google-analytics|gtag|amplitude|mixpanel|sentry|hotjar' package.json index.html src` 결과 0건.
  - `grep -r 'grantPromotionReward' src` 결과 0건.
  - `grep -rE 'anthropic|openai|gemini|generateText|completions' src` 결과 0건이고 `simulate()`가 유일한 예측 산출 경로.
  - `vite build && vite preview` 후 온보딩→홈→미션→시뮬레이션→결과→리포트 1회 순회 시 `console.error` 호출 0회.
  - DevTools Network 탭에서 자체 origin 정적 자산 외 cross-origin 요청 0건, CORS 에러 로그 0건.
  - 모든 Button / ListRow / Chip / Switch / FloatingTabBar 아이템의 `getBoundingClientRect().height >= 44`이며 측정표를 `docs/compliance-check.md`에 기록.
  - `.env.example`에 2개 광고 환경변수가 주석과 함께 존재하고 소스에 광고 ID 하드코딩 0건.
- Covers: [AC-G-1, AC-G-2, AC-G-3, AC-G-4, AC-G-5, AC-G-6, AC-G-8, AC-G-9, AC-G-10]
- Files: [docs/compliance-check.md, .env.example]
- Depends on: Task 4.1

---

## AC Coverage

- Total ACs in SPEC: 74 (전역 AC-G-1~AC-G-12 = 12, F1 = 7, F2 = 7, F3 = 8, F4 = 8, F5 = 8, F6 = 8, F7 = 8, F8 = 8)
- Covered by tasks: 74
  - AC-G-1 → Task 2.4, Task 4.2
  - AC-G-2 → Task 4.2
  - AC-G-3 → Task 4.2
  - AC-G-4 → Task 4.2
  - AC-G-5 → Task 1.1, Task 3.1, Task 4.2
  - AC-G-6 → Task 4.2
  - AC-G-7 → Task 1.2, Task 4.1
  - AC-G-8 → Task 4.2
  - AC-G-9 → Task 4.2
  - AC-G-10 → Task 3.1, Task 4.2
  - AC-G-11 → Task 2.1
  - AC-G-12 → Task 2.1, Task 4.1
  - F1-AC-1 → Task 1.2, Task 2.1
  - F1-AC-2 → Task 2.2
  - F1-AC-3 → Task 2.2
  - F1-AC-4 → Task 2.1
  - F1-AC-5 → Task 2.1
  - F1-AC-6 → Task 2.1, Task 2.2
  - F1-AC-7 → Task 2.2
  - F2-AC-1 → Task 3.2
  - F2-AC-2 → Task 3.2, Task 4.1
  - F2-AC-3 → Task 3.2
  - F2-AC-4 → Task 3.2
  - F2-AC-5 → Task 3.2
  - F2-AC-6 → Task 3.2
  - F2-AC-7 → Task 3.2
  - F3-AC-1 → Task 3.3
  - F3-AC-2 → Task 3.3
  - F3-AC-3 → Task 3.3
  - F3-AC-4 → Task 3.3
  - F3-AC-5 → Task 3.3
  - F3-AC-6 → Task 3.3, Task 4.1
  - F3-AC-7 → Task 3.3
  - F3-AC-8 → Task 3.3
  - F4-AC-1 → Task 2.6, Task 3.4
  - F4-AC-2 → Task 2.6, Task 3.4
  - F4-AC-3 → Task 2.6, Task 3.4
  - F4-AC-4 → Task 3.4
  - F4-AC-5 → Task 3.4
  - F4-AC-6 → Task 3.4
  - F4-AC-7 → Task 2.6, Task 3.4
  - F4-AC-8 → Task 3.4
  - F5-AC-1 → Task 2.3
  - F5-AC-2 → Task 2.3
  - F5-AC-3 → Task 2.3
  - F5-AC-4 → Task 2.6, Task 3.5
  - F5-AC-5 → Task 3.5
  - F5-AC-6 → Task 3.5
  - F5-AC-7 → Task 2.3
  - F5-AC-8 → Task 3.5
  - F6-AC-1 → Task 2.4
  - F6-AC-2 → Task 2.4
  - F6-AC-3 → Task 3.6
  - F6-AC-4 → Task 3.6
  - F6-AC-5 → Task 3.6
  - F6-AC-6 → Task 3.6
  - F6-AC-7 → Task 3.6
  - F6-AC-8 → Task 3.6
  - F7-AC-1 → Task 3.7
  - F7-AC-2 → Task 3.7
  - F7-AC-3 → Task 3.7
  - F7-AC-4 → Task 3.7
  - F7-AC-5 → Task 3.7
  - F7-AC-6 → Task 3.7
  - F7-AC-7 → Task 3.7
  - F7-AC-8 → Task 3.7
  - F8-AC-1 → Task 2.5, Task 3.8
  - F8-AC-2 → Task 3.8
  - F8-AC-3 → Task 3.8
  - F8-AC-4 → Task 2.5, Task 3.8
  - F8-AC-5 → Task 2.5, Task 3.8
  - F8-AC-6 → Task 2.5, Task 3.8
  - F8-AC-7 → Task 3.8
  - F8-AC-8 → Task 3.8
- Uncovered: 0

---

## 의존성 그래프 (실행 순서)

```
1.1 ─┬─ 1.2 ─┬─ 2.1 ── 2.2 ─┐
     │       ├─ 2.3 ────────┼─ 2.6 ─┬─ 3.2 ─┐
     │       ├─ 2.4 ────────┘       ├─ 3.3 ─┤
     │       └─ 2.5 ────────────────┼─ 3.4 ─┤
     └─ 3.1 ─────────────────────────┼─ 3.5 ─┼─ 4.1 ── 4.2
                                     ├─ 3.6 ─┤
                                     │   └ 3.7
                                     └─ 3.8 ─┘
```

병렬 가능 구간: 2.3 / 2.4 / 2.5는 서로 독립(각각 1.2만 의존). 3.1은 1.1 직후 언제든 가능. 3.2~3.6, 3.8은 2.6 완료 후 병렬 가능하며 3.7만 3.6에 후행한다.