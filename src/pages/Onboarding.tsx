import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';
import { getItem, setItem } from '../lib/storage';
import type { AppFlags } from '../lib/types';

const FLAGS_KEY = 'scoreclimb.flags.v1';

/**
 * 온보딩 — 부트 게이트를 통과시키는 최소 화면.
 *
 * @AI:NOTE 라우팅 셸 패킷이 만든 골격이다. F2(온보딩) 패킷이 점수·출생연도·카드
 *   사용률·대출 건수 4개 TextField 폼과 CreditProfile 저장으로 이 본문을 대체한다.
 *   대체하더라도 `flags.onboardingDone = true` 저장은 반드시 유지하라 —
 *   이 값이 없으면 App.tsx의 부트 게이트가 홈 진입을 계속 막는다.
 */
export default function Onboarding() {
  const navigate = useNavigate();

  const start = () => {
    const prev = getItem<Partial<AppFlags>>(FLAGS_KEY);
    const flags: AppFlags = {
      onboardingDone: true,
      disclaimerAckedAt: prev?.disclaimerAckedAt ?? new Date().toISOString(),
    };
    setItem(FLAGS_KEY, flags);
    navigate('/', { replace: true });
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>신용점수를 알려주세요</Top.TitleParagraph>} />}>
      <Card testId="onboarding-form">
        <Paragraph.Text typography="t4">
          점수를 기록해두면 매일 미션과 6개월 뒤 예상 점수를 볼 수 있어요.
        </Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st13">
          입력한 값은 이 기기에만 저장되고 어디에도 전송되지 않아요.
        </Paragraph.Text>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={start}>
          시작하기
        </Button>
      </Card>
    </ScreenScaffold>
  );
}
