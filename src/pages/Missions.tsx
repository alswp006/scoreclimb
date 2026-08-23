import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';

/**
 * 오늘의 미션 — 라우팅 셸 패킷이 만든 골격.
 *
 * @AI:NOTE F4(미션) 패킷이 ListRow 6개 + Switch + 진행률 MiniBar로 본문을 대체한다.
 *   하단 탭바는 App.tsx가 렌더하므로 여기서 다시 넣지 마라(중복 렌더).
 */
export default function Missions() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 미션</Top.TitleParagraph>} />}>
      <EmptyState
        title="오늘 완료한 미션이 없어요"
        description="미션을 완료하면 점수와 연속 기록이 쌓여요"
        testId="mission-empty"
      />
    </ScreenScaffold>
  );
}
