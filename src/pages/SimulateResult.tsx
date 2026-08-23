import { Top, Button } from '@toss/tds-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { EmptyState } from '../components/StateView';
import { Amount } from '../components/Amount';
import type { RouteState } from '../lib/types';

/**
 * 시뮬레이션 결과 — 라우팅 셸 패킷이 만든 골격.
 *
 * @AI:NOTE 수신 state 계약은 `RouteState['/simulate/result']` = `{ result } | undefined`.
 *   F7 패킷이 TossRewardAd 게이트 + 요인 Card 4개 + Sparkline으로 본문을 대체한다.
 *   state가 없을 때 자동 리다이렉트 대신 나가는 버튼을 두는 이유: 뒤로가기 직후
 *   replace 이동이 겹치면 사용자가 시뮬레이션 화면 사이에 갇힌다.
 */
export default function SimulateResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RouteState['/simulate/result'];
  const result = state?.result;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>시뮬레이션 결과</Top.TitleParagraph>} />}
    >
      {result ? (
        <SummaryHero
          label="6개월 뒤 예상 점수"
          value={<Amount value={result.predictedScore} unit="점" typography="t1" />}
          caption={
            typeof result.delta === 'number'
              ? `지금보다 ${result.delta >= 0 ? '+' : ''}${result.delta}점`
              : undefined
          }
          action={
            <Button
              variant="weak"
              display="block"
              onClick={() => navigate('/simulate', { replace: true })}
            >
              값 바꿔서 다시 계산
            </Button>
          }
          testId="sim-hero"
        />
      ) : (
        <EmptyState
          title="아직 계산한 결과가 없어요"
          description="카드 사용률과 상환 기록을 입력하면 6개월 뒤 점수를 계산해요"
          action={
            <Button
              variant="weak"
              display="block"
              onClick={() => navigate('/simulate', { replace: true })}
            >
              시뮬레이션 입력하기
            </Button>
          }
          testId="sim-empty"
        />
      )}
    </ScreenScaffold>
  );
}
