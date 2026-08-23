import { useEffect, useRef, useState } from 'react';
import { Top, Paragraph, Spacing, TextField, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { useAppData } from '../hooks/useAppData';
import { simulate } from '../lib/simulate';
import type { RouteState, SimulationInput } from '../lib/types';

const SCORE_HELP = '350~1000 사이로 입력해요';
const USAGE_HELP = '0~100 사이로 입력해요';
const ONTIME_HELP = '0~24개월까지 입력할 수 있어요';
const LOAN_HELP = '0~5건까지 입력할 수 있어요';

const DEFAULT_SCORE = 700;
const DEFAULT_USAGE = 40;

function parseField(raw: string): number {
  return raw.trim() === '' ? NaN : Number(raw);
}

function isInRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * S5 시뮬레이션 입력 — 현재 점수·카드 사용률·정시 납부 개월·신규 대출 건수로
 * 6개월 뒤 점수를 계산해 `/simulate/result`로 전달한다.
 *
 * @AI:NOTE 이 화면은 탭-루트(App.tsx가 FloatingTabBar를 한 번만 렌더)라, CTA를
 *   화면 맨 아래(bottom:0)에 고정하면 탭바와 겹친다. 그래서 탭바 높이만큼
 *   띄워 고정한다 — App.tsx의 탭바 여백 계산과 동일한 값을 사용한다.
 */
export default function Simulate() {
  const navigate = useNavigate();
  const { loading, profile, streak } = useAppData();

  const [currentScore, setCurrentScore] = useState('');
  const [cardUsageRatio, setCardUsageRatio] = useState('');
  const [onTimePaymentMonths, setOnTimePaymentMonths] = useState('');
  const [newLoanCount, setNewLoanCount] = useState('');

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (loading || prefilledRef.current) return;
    prefilledRef.current = true;
    setCurrentScore(String(profile?.score ?? DEFAULT_SCORE));
    setCardUsageRatio(String(profile?.cardUsageRatio ?? DEFAULT_USAGE));
  }, [loading, profile]);

  const scoreN = parseField(currentScore);
  const usageN = parseField(cardUsageRatio);
  const onTimeN = parseField(onTimePaymentMonths);
  const loanN = parseField(newLoanCount);

  const scoreValid = isInRange(scoreN, 350, 1000);
  const usageValid = isInRange(usageN, 0, 100);
  const onTimeValid = isInRange(onTimeN, 0, 24);
  const loanValid = isInRange(loanN, 0, 5);

  const scoreError = currentScore !== '' && !scoreValid ? SCORE_HELP : null;
  const usageError = cardUsageRatio !== '' && !usageValid ? USAGE_HELP : null;
  const onTimeError = onTimePaymentMonths !== '' && !onTimeValid ? ONTIME_HELP : null;
  const loanError = newLoanCount !== '' && !loanValid ? LOAN_HELP : null;

  const isValid = scoreValid && usageValid && onTimeValid && loanValid;

  const handleSubmit = () => {
    if (!isValid) return;

    fireSuccessHaptic();

    const input: SimulationInput = {
      currentScore: scoreN,
      cardUsageRatio: usageN,
      onTimePaymentMonths: onTimeN,
      newLoanCount: loanN,
    };
    const result = simulate(input, { current: streak.current });

    navigate('/simulate/result', {
      state: { result } as RouteState['/simulate/result'],
    });
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>점수 시뮬레이션</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="st11" color="secondary">
        조건을 바꾸면 6개월 뒤 점수를 예측해요
      </Paragraph.Text>
      <Spacing size={24} />
      <TextField
        variant="box"
        type="number"
        label="현재 점수"
        placeholder="예: 750"
        inputMode="numeric"
        data-testid="currentScore-input"
        value={currentScore}
        onChange={(e) => setCurrentScore(e.target.value)}
        help={scoreError ?? SCORE_HELP}
        hasError={!!scoreError}
      />
      <Spacing size={16} />
      <TextField
        variant="box"
        type="number"
        label="카드 사용률 (%)"
        placeholder="예: 40"
        inputMode="numeric"
        data-testid="cardUsageRatio-input"
        value={cardUsageRatio}
        onChange={(e) => setCardUsageRatio(e.target.value)}
        help={usageError ?? USAGE_HELP}
        hasError={!!usageError}
      />
      <Spacing size={16} />
      <TextField
        variant="box"
        type="number"
        label="정시 납부 개월"
        placeholder="예: 12"
        inputMode="numeric"
        data-testid="onTimePaymentMonths-input"
        value={onTimePaymentMonths}
        onChange={(e) => setOnTimePaymentMonths(e.target.value)}
        help={onTimeError ?? ONTIME_HELP}
        hasError={!!onTimeError}
      />
      <Spacing size={16} />
      <TextField
        variant="box"
        type="number"
        label="신규 대출 건수"
        placeholder="예: 0"
        inputMode="numeric"
        data-testid="newLoanCount-input"
        value={newLoanCount}
        onChange={(e) => setNewLoanCount(e.target.value)}
        help={loanError ?? LOAN_HELP}
        hasError={!!loanError}
      />
      <Spacing size={24} />
      <Paragraph.Text typography="st13" color="tertiary">
        이 예측은 입력값 기반 참고값이에요. 실제 평가 결과와 다를 수 있어요
      </Paragraph.Text>
      <Spacing size={96} />
      <Button
        data-testid="simulate-cta"
        variant="fill"
        color="primary"
        size="large"
        display="block"
        disabled={!isValid}
        onClick={handleSubmit}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(var(--toss-safe-area-bottom) + 64px)',
          paddingTop: 16,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        결과 보기
      </Button>
    </ScreenScaffold>
  );
}
