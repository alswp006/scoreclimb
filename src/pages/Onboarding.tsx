import { useEffect, useState } from 'react';
import { Top, Paragraph, Spacing, TextField, AlertDialog, Toast } from '@toss/tds-mobile';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SubmitFooter } from '../components/BottomCTA';
import { useAppData } from '../hooks/useAppData';

const SCORE_HELP = '350~1000 사이 숫자로 입력해요';
const BIRTH_HELP = '1960~2010 사이로 입력해요';
const USAGE_HELP = '0~100 사이로 입력해요';
const LOAN_HELP = '0~10건까지 입력할 수 있어요';

function parseField(raw: string): number {
  return raw.trim() === '' ? NaN : Number(raw);
}

function isInRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

/**
 * S1 온보딩 — 신용 현황 4개 필드를 입력받아 CreditProfile + 오늘자 ScoreSnapshot을 저장하고
 * flags.onboardingDone=true를 기록한 뒤 홈으로 이동한다.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const { flags, loading, actions } = useAppData();

  const [score, setScore] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [cardUsageRatio, setCardUsageRatio] = useState('');
  const [loanCount, setLoanCount] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(flags.disclaimerAckedAt === null);

  const scoreN = parseField(score);
  const birthYearN = parseField(birthYear);
  const usageN = parseField(cardUsageRatio);
  const loanN = parseField(loanCount);

  const scoreValid = isInRange(scoreN, 350, 1000);
  const birthValid = isInRange(birthYearN, 1960, 2010);
  const usageValid = isInRange(usageN, 0, 100);
  const loanValid = isInRange(loanN, 0, 10);

  const scoreError = score !== '' && !scoreValid ? SCORE_HELP : null;
  const birthError = birthYear !== '' && !birthValid ? BIRTH_HELP : null;
  const usageError = cardUsageRatio !== '' && !usageValid ? USAGE_HELP : null;
  const loanError = loanCount !== '' && !loanValid ? LOAN_HELP : null;

  const isValid = scoreValid && birthValid && usageValid && loanValid;

  const handleAck = async () => {
    await actions.ackDisclaimer();
    setDisclaimerOpen(false);
  };

  const handleSubmit = async () => {
    if (!isValid || saving) return;

    setSaving(true);
    setSaveError(null);

    const result = await actions.saveProfileAndSnapshot({
      score: scoreN,
      birthYear: birthYearN,
      cardUsageRatio: usageN,
      loanCount: loanN,
    });

    if (!result.ok) {
      setSaveError(result.error);
      setSaving(false);
      return;
    }

    await actions.completeOnboarding();
    navigate('/', { replace: true });
  };

  // AC-2[P0]: 온보딩을 이미 마친 사용자가 /onboarding에 직접 진입하면 홈으로 되돌린다
  if (!loading && flags.onboardingDone) {
    return <Navigate to="/" replace />;
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>신용 현황을 알려주세요</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="저장하고 시작하기" onClick={handleSubmit} disabled={!isValid || saving} />}
    >
      <Paragraph.Text typography="st11" color="secondary">
        토스 앱에서 확인한 점수를 그대로 입력하면 돼요
      </Paragraph.Text>
      <Spacing size={24} />
      <TextField
        variant="box"
        label="신용점수 (KCB)"
        placeholder="예: 780"
        inputMode="numeric"
        data-testid="score-input"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        help={scoreError ?? SCORE_HELP}
        hasError={!!scoreError}
      />
      <Spacing size={16} />
      <TextField
        variant="box"
        label="출생연도"
        placeholder="예: 1990"
        inputMode="numeric"
        data-testid="birthYear-input"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        help={birthError ?? BIRTH_HELP}
        hasError={!!birthError}
      />
      <Spacing size={16} />
      <TextField
        variant="box"
        label="카드 사용률 (%)"
        placeholder="예: 30"
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
        label="대출 건수"
        placeholder="예: 2"
        inputMode="numeric"
        data-testid="loanCount-input"
        value={loanCount}
        onChange={(e) => setLoanCount(e.target.value)}
        help={loanError ?? LOAN_HELP}
        hasError={!!loanError}
      />
      <Spacing size={24} />
      <Paragraph.Text typography="st13" color="tertiary">
        입력한 값은 이 기기에만 저장돼요. 앱이 보여주는 점수는 참고값이에요
      </Paragraph.Text>
      <Spacing size={96} />
      <AlertDialog
        open={disclaimerOpen}
        title="참고용 안내"
        description="이 앱의 점수·예측은 입력값 기반 참고값이에요. 실제 신용평가 결과와 달라요"
        alertButton={<AlertDialog.AlertButton onClick={handleAck}>확인</AlertDialog.AlertButton>}
        onClose={handleAck}
      />
      <Toast open={!!saveError} position="bottom" text={saveError ?? ''} />
    </ScreenScaffold>
  );
}
