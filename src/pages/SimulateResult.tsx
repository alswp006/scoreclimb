import { useEffect, useRef } from 'react';
import { Top, Paragraph, Spacing, Button, ListRow, Chip } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { EmptyState, LoadingState } from '../components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { useAppData } from '../hooks/useAppData';
import { loadBadges, saveBadges } from '../lib/repository';
import { evaluateBadges } from '../lib/badges';
import type { RouteState, SimulationResult } from '../lib/types';

const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? 'sim-result-unlock';

function directionLabel(direction: SimulationResult['factors'][number]['direction']): string {
  if (direction === 'up') return '상승';
  if (direction === 'down') return '하락';
  return '유지';
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * 시뮬레이션 결과 — location.state 우선, 없으면 마지막 저장 결과로 대체.
 *
 * @AI:NOTE 진입 시 결과를 lastSimulation에 저장하고 b_simulator 배지를 1회
 *   평가한다(recordedRef로 재실행 방지 — StrictMode/재렌더에도 setItem 1회 보장).
 *   결과 본문은 TossRewardAd로 게이트하되, 없는 상태(EmptyState)는 게이트하지 않는다.
 */
export default function SimulateResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, lastSimulation, actions } = useAppData();

  const routeState = (location.state as RouteState['/simulate/result']) ?? null;
  const result: SimulationResult | null = routeState?.result ?? lastSimulation ?? null;

  const recordedRef = useRef(false);
  useEffect(() => {
    if (!result || recordedRef.current) return;
    recordedRef.current = true;

    actions.recordSimulation(result);

    try {
      const prevBadges = loadBadges();
      const { next } = evaluateBadges(
        prevBadges,
        { streak: 0, simulated: true },
        new Date().toISOString()
      );
      saveBadges(next);
    } catch {
      /* best-effort — 배지 평가 실패가 결과 화면을 막지 않는다 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 result 1회 처리
  }, [result]);

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>예측 결과</Top.TitleParagraph>} />}>
        <LoadingState rows={4} testId="sim-result-skeleton" />
      </ScreenScaffold>
    );
  }

  if (!result) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>예측 결과</Top.TitleParagraph>} />}>
        <EmptyState
          testId="sim-empty"
          title="아직 시뮬레이션 결과가 없어요"
          description="조건을 입력하면 6개월 뒤 예상 점수를 계산해드려요"
          action={
            <Button variant="fill" size="large" display="block" onClick={() => navigate('/simulate')}>
              시뮬레이션 하러 가기
            </Button>
          }
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>예측 결과</Top.TitleParagraph>} />}>
      <TossRewardAd slotId={AD_SLOT_ID}>
        <div data-testid="sim-result">
          <SummaryHero
            label="6개월 뒤 예상 점수"
            value={<Amount value={result.predictedScore} unit="점" typography="t1" />}
            caption={`지금보다 ${signed(result.delta)}점이에요`}
          />
          <Spacing size={24} />
          <Paragraph.Text typography="t4">월별 예상 추이</Paragraph.Text>
          <Spacing size={12} />
          {/* 마지막 달(6개월 뒤)은 predictedScore와 항상 동일(수식상 보장)이라
              위 히어로가 이미 보여준다 — 목록에서 중복 표기하지 않는다. */}
          {result.monthlyProjection.slice(0, -1).map((s, i) => (
            <ListRow
              key={i}
              contents={<ListRow.Texts type="2RowTypeA" top={`${i + 1}개월 뒤`} bottom={`${s}점`} />}
            />
          ))}
          <Spacing size={24} />
          <Paragraph.Text typography="t4">영향을 준 요인</Paragraph.Text>
          <Spacing size={12} />
          {result.factors.map((f) => (
            <div key={f.label}>
              <Card testId="factor-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ListRow.Texts type="2RowTypeA" top={f.label} bottom={`${signed(f.impact)}점`} />
                  <Chip variant="weak">{directionLabel(f.direction)}</Chip>
                </div>
              </Card>
              <Spacing size={8} />
            </div>
          ))}
        </div>
      </TossRewardAd>
      <Spacing size={16} />
      <Paragraph.Text typography="st13" color="tertiary">
        입력값 기반 참고값이에요. 실제 평가 결과와 다를 수 있어요
      </Paragraph.Text>
      <Spacing size={16} />
    </ScreenScaffold>
  );
}
