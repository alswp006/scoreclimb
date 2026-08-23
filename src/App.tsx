import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { House, ListChecks, TrendingUp, ChartLine } from 'lucide-react';
import { FloatingTabBar } from './components/FloatingTabBar';
import type { TabItem } from './components/FloatingTabBar';
import { PageShell } from './components/PageShell';
import { LoadingState } from './components/StateView';
import { getItem } from './lib/storage';
import type { AppFlags } from './lib/types';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Missions from './pages/Missions';
import Badges from './pages/Badges';
import Simulate from './pages/Simulate';
import SimulateResult from './pages/SimulateResult';
import Report from './pages/Report';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

const FLAGS_KEY = 'scoreclimb.flags.v1';

/**
 * 하단 탭 4개. 노출 라우트는 여기 path와 정확히 일치하는 경로뿐이다
 * (spec 라우팅 트리: `/onboarding`, `/simulate/result`, `/badges`는 비노출).
 *
 * @AI:NOTE 탭바는 이 셸에서 단 한 번만 렌더한다. 각 페이지가 자기 ScreenScaffold의
 *   bottom에 FloatingTabBar를 또 넣으면 탭이 두 벌 렌더되어 겹친다 — 페이지 패킷은
 *   본문만 채우고 탭바는 건드리지 마라.
 */
const TAB_ITEMS: TabItem[] = [
  { label: '홈', path: '/', icon: <House size={22} aria-hidden /> },
  { label: '미션', path: '/missions', icon: <ListChecks size={22} aria-hidden /> },
  { label: '시뮬레이션', path: '/simulate', icon: <TrendingUp size={22} aria-hidden /> },
  { label: '리포트', path: '/report', icon: <ChartLine size={22} aria-hidden /> },
];

const TAB_PATHS = TAB_ITEMS.map((tab) => tab.path);

/**
 * @AI:NOTE 부트 게이트 판정은 렌더마다 localStorage를 다시 읽는다(동기).
 *   값을 마운트 시 1회만 캐시하면, 온보딩을 막 끝내고 `/`로 돌아온 순간 stale한
 *   `false`를 보고 다시 온보딩으로 튕겨 무한 루프가 된다.
 *   손상된 JSON은 storage.getItem이 null로 흡수하므로 → 온보딩부터 다시 시작(AC-G12).
 */
function isOnboardingDone(): boolean {
  return getItem<Partial<AppFlags>>(FLAGS_KEY)?.onboardingDone === true;
}

/** 온보딩을 마치지 않았으면 어떤 경로로 들어와도 `/onboarding`으로 replace 이동. */
function BootGate() {
  if (!isOnboardingDone()) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}

/** 코드 스플릿 청크를 기다리는 동안의 셸 — 흰 화면 대신 스켈레톤. */
function BootFallback() {
  return (
    <PageShell>
      <div style={{ padding: '16px 16px 0' }}>
        <LoadingState rows={3} testId="boot-skeleton" />
      </div>
    </PageShell>
  );
}

export default function App() {
  const location = useLocation();
  const showTabBar = TAB_PATHS.indexOf(location.pathname) !== -1;

  return (
    <>
      <Suspense fallback={<BootFallback />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />

          {/* 온보딩 이후에만 진입 가능한 화면들 */}
          <Route element={<BootGate />}>
            <Route path="/" element={<Home />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/simulate" element={<Simulate />} />
            <Route path="/simulate/result" element={<SimulateResult />} />
            <Route path="/report" element={<Report />} />
          </Route>

          {DevTdsGallery && (
            <Route path="/__tds-gallery" element={<DevTdsGallery />} />
          )}

          {/* 알 수 없는 경로 → 홈으로. 404 흰 화면을 만들지 않는다. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {showTabBar && (
        <>
          {/* 고정 탭바에 본문 마지막 줄이 가리지 않도록 확보하는 여백 */}
          <div aria-hidden style={{ height: 'calc(var(--toss-safe-area-bottom) + 64px)' }} />
          <FloatingTabBar items={TAB_ITEMS} />
        </>
      )}
    </>
  );
}
