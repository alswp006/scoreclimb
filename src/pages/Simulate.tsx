import { Top, Paragraph, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';

/**
 * 점수 시뮬레이션 입력 — 라우팅 셸 패킷이 만든 골격.
 *
 * @AI:NOTE F6(시뮬레이션) 패킷이 TextField 3개 + 사용률 프리셋 Chip + SubmitFooter로
 *   본문을 대체하고, 제출 시 navigate('/simulate/result', { state: { result } })로
 *   `RouteState['/simulate/result']` 모양의 값을 넘긴다.
 *   하단 탭바는 App.tsx가 렌더한다 — 여기서 다시 넣지 마라.
 */
export default function Simulate() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>점수 시뮬레이션</Top.TitleParagraph>} />}>
      <Card testId="simulate-form">
        <Paragraph.Text typography="t4">
          카드 사용률, 연체 없는 개월 수, 신규 대출 건수로 6개월 뒤 점수를 계산해요.
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st13">
          계산 결과는 참고값이며 신용평가사의 공식 평가와 다를 수 있어요.
        </Paragraph.Text>
      </Card>
    </ScreenScaffold>
  );
}
