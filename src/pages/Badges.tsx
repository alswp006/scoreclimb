import { Top, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';

/**
 * 스트릭 & 배지 — 라우팅 셸 패킷이 만든 골격.
 *
 * @AI:NOTE F5(스트릭·배지) 패킷이 SummaryHero(연속 일수) + 배지 Card 6개 그리드로
 *   본문을 대체한다. 이 경로는 탭바 비노출이므로 나가는 길(아래 버튼)을 반드시 유지하라.
 */
export default function Badges() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>나의 기록</Top.TitleParagraph>} />}>
      <EmptyState
        title="아직 받은 배지가 없어요"
        description="오늘 미션 1개만 완료해도 첫 배지를 받아요"
        action={
          <Button variant="weak" display="block" onClick={() => navigate('/missions')}>
            미션 하러 가기
          </Button>
        }
        testId="badge-empty"
      />
    </ScreenScaffold>
  );
}
