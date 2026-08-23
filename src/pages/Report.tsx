import { Top, Paragraph, Spacing, ListRow, Chip, Border, Button } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { Card } from '../components/Card';
import { Sparkline } from '../components/Sparkline';
import { AdSlot } from '../components/AdSlot';
import { EmptyState, LoadingState } from '../components/StateView';
import { useAppData } from '../hooks/useAppData';
import { getBand, getBenchmark, compareToPeer } from '../lib/benchmark';
import { todayKey } from '../lib/date';

const VERDICT_LABEL: Record<'above' | 'similar' | 'below', string> = {
  above: '높아요',
  similar: '비슷해요',
  below: '낮아요',
};

function formatSignedDiff(diff: number): string {
  return `${diff >= 0 ? '+' : ''}${diff}점`;
}

function verdictText(verdict: 'above' | 'similar' | 'below', diff: number): string {
  if (verdict === 'similar') return '또래와 비슷한 수준이에요';
  if (verdict === 'above') return `또래보다 ${diff}점 높아요`;
  return `또래보다 ${Math.abs(diff)}점 낮아요`;
}

/**
 * S7 또래 비교 리포트 — 연령 밴드 기준값과 내 점수·카드 사용률을 나란히 비교.
 *
 * @AI:NOTE 또래 값은 앱 자체 산정 참고값이다(공식 신용평가사 통계 아님) — 이 고지는
 *   화면 상단이 아니라 비교 항목 바로 아래 상시 노출한다(AC-3). 탭바는 App.tsx 담당.
 */
export default function Report() {
  const navigate = useNavigate();
  const { loading, profile, scoreHistory } = useAppData();

  if (loading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>또래 비교 리포트</Top.TitleParagraph>} />}>
        <LoadingState rows={4} testId="report-loading" />
      </ScreenScaffold>
    );
  }

  if (!profile) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>또래 비교 리포트</Top.TitleParagraph>} />}>
        <EmptyState
          title="신용 현황을 먼저 입력해 주세요"
          description="같은 연령대 기준값과 내 점수·카드 사용률을 나란히 비교해드려요"
          action={
            <Button variant="weak" size="large" display="block" onClick={() => navigate('/onboarding')}>
              현황 입력하러 가기
            </Button>
          }
          testId="report-empty"
        />
        <Spacing size={16} />
        <Paragraph.Text typography="st13" color="tertiary">
          또래 평균은 앱 자체 산정 참고값이에요. 공식 신용평가사 통계가 아니에요
        </Paragraph.Text>
      </ScreenScaffold>
    );
  }

  const band = getBand(profile.birthYear, todayKey());
  const benchmark = getBenchmark(band);
  const comparison = compareToPeer(profile, benchmark);

  const trend = scoreHistory.slice(-30).map((s) => s.score);

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>또래 비교 리포트</Top.TitleParagraph>} />}>
      <SummaryHero
        label={`${band} 또래와 비교하면`}
        value={<Amount value={Math.abs(comparison.scoreDiff)} unit="점" typography="t1" />}
        caption={verdictText(comparison.scoreVerdict, comparison.scoreDiff)}
        testId="report-hero"
      />

      <Spacing size={24} />
      <Paragraph.Text typography="t4">항목별 비교</Paragraph.Text>
      <Spacing size={12} />

      <Card testId="report-comparison-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="신용점수"
              bottom={`내 ${profile.score}점 · 또래 평균 ${benchmark.avgScore}점`}
            />
          }
          right={
            <Chip variant="weak">
              <span data-testid="report-score-diff" data-verdict={comparison.scoreVerdict}>
                {`${formatSignedDiff(comparison.scoreDiff)} · ${VERDICT_LABEL[comparison.scoreVerdict]}`}
              </span>
            </Chip>
          }
        />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="카드 사용률"
              bottom={`내 ${profile.cardUsageRatio}% · 또래 평균 ${benchmark.avgCardUsageRatio}%`}
            />
          }
        />
      </Card>

      <Spacing size={16} />
      <Paragraph.Text typography="st13" color="tertiary">
        또래 평균은 앱 자체 산정 참고값이에요. 공식 신용평가사 통계가 아니에요
      </Paragraph.Text>

      <Spacing size={24} />
      <Paragraph.Text typography="t4">최근 점수 추이</Paragraph.Text>
      <Spacing size={12} />

      <Card testId="report-trend-card">
        {trend.length >= 2 ? (
          <>
            <Sparkline data={trend} testId="report-trend-sparkline" />
            <Spacing size={8} />
            <Paragraph.Text typography="st13" color="tertiary">
              최근 {trend.length}개 기록 · 최신 {trend[trend.length - 1]}점
            </Paragraph.Text>
          </>
        ) : (
          <Paragraph.Text typography="st13" color="tertiary">
            기록이 2일 이상 쌓이면 추이를 보여드려요
          </Paragraph.Text>
        )}
      </Card>

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? 'report-peer-compare'} />

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
