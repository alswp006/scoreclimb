# Sprint Contract — Packet 0010: Routing Tree + Boot Gate + FloatingTabBar Wiring

## Deliverable: src/App.tsx

### 만들 항목
1. **BrowserRouter라우팅 트리** — 7개 Route 정의: `/onboarding`, `/`, `/missions`, `/badges`, `/simulate`, `/simulate/result`, `/report`
2. **부트 게이트** — `flags.onboardingDone === false`면 `/onboarding`으로 리다이렉트하는 BootGate 컴포넌트 (ProtectedRoute 패턴)
3. **404 처리** — 알 수 없는 경로 접근 시 `navigate('/', { replace: true })`로 홈으로 리다이렉트
4. **FloatingTabBar 배선** — 홈(/), 미션(/missions), 시뮬레이션(/simulate), 리포트(/report) 4탭 네비게이션 배선 (탭 외부 라우트 /onboarding, /simulate/result는 탭바 숨김)

### 사용할 TypeScript 타입
- `AppFlags` — onboardingDone 플래그 확인
- `RouteState` — 각 라우트별 상태 파라미터 타입 정의 (navigate state와 일치)

### 검증 방법
- `npx tsc --noEmit` — 라우트 파라미터 타입 검증
- 브라우저: 직접 URL 입력 `/unknown` → `/`로 리다이렉트 확인, onboarding=false → /onboarding 자동 진입 확인
- 4탭 모두 활성/비활성 전환 가능 확인, /onboarding·/simulate/result에선 탭바 미렌더링 확인

### 절대 금지
- main.tsx 수정 금지 (TDSMobileAITProvider/BrowserRouter 이미 설정)
- App.tsx 내에 BrowserRouter/Provider 재선언 금지 (main.tsx에서 이미 감싸짐)
- 페이지 컴포넌트는 아직 생성하지 마라 (라우팅 구조만 정의, 다음 패킷에서 각 페이지 구현)
