import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';

/**
 * 또래 비교 리포트 — 라우팅 셸 패킷이 만든 골격.
 *
 * @AI:NOTE F8(리포트) 패킷이 비교 Card 2개 + MiniBar + 추천 미션 ListRow로 본문을
 *   대체한다. 참고값 고지 문구는 DOM에 상시 유지하라(AC 요구). 탭바는 App.tsx 담당.
 */
export default function Report() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>또래 비교</Top.TitleParagraph>} />}>
      <EmptyState
        title="점수를 입력하면 또래와 비교해드려요"
        description="같은 연령대 기준값과 내 점수·카드 사용률을 나란히 보여줘요"
        action={
          <Button variant="weak" display="block" onClick={() => navigate('/onboarding')}>
            점수 입력하기
          </Button>
        }
        testId="report-empty"
      />
      <Spacing size={16} />
      <Paragraph.Text typography="st13">
        또래 평균은 ScoreClimb 자체 기준의 참고값이며 신용평가사 공식 통계가 아니에요
      </Paragraph.Text>
    </ScreenScaffold>
  );
}
