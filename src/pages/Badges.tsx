import { useState } from 'react';
import { Top, Paragraph, Spacing, Asset, Chip, Button, Toast } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { Card } from '../components/Card';
import { useAppData } from '../hooks/useAppData';
import { BADGE_DEFINITIONS } from '../lib/constants';

/** ISO 8601 → "YYYY.MM.DD" (문자열 슬라이스라 타임존에 무관하다). */
function formatUnlockedDate(iso: string): string {
  return iso.slice(0, 10).split('-').join('.');
}

/** `kind:threshold` 조건 문자열 → 사용자용 안내 문구. */
function describeBadgeCondition(condition: string): string {
  const [kind, raw] = condition.split(':');
  const value = Number(raw);
  if (kind === 'streak') return `${value}일 연속 달성하면 열려요`;
  if (kind === 'totalMissions') return `미션을 ${value}개 완료하면 열려요`;
  return '시뮬레이션을 실행하면 열려요';
}

/**
 * S4 스트릭 & 배지 — 연속 출석 요약 + BADGE_DEFINITIONS 6종 갤러리.
 *
 * @AI:NOTE 이 경로는 하단 탭바가 비노출(App.tsx TAB_ITEMS에 없음)이므로
 *   나가는 길(홈으로 버튼)을 반드시 유지한다. 획득 배지가 0개여도 EmptyState 대신
 *   6개 잠금 카드를 그대로 렌더한다(AC-4) — 갤러리 자체가 콘텐츠다.
 */
export default function Badges() {
  const navigate = useNavigate();
  const { streak, badges } = useAppData();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const unlockedSet = new Set(badges.unlockedBadgeIds);

  const handleCardTap = (badgeName: string, unlocked: boolean, unlockedAt: string | undefined, condition: string) => {
    if (unlocked && unlockedAt) {
      setToastMessage(`${badgeName} · ${formatUnlockedDate(unlockedAt)}에 획득했어요`);
    } else {
      setToastMessage(describeBadgeCondition(condition));
    }
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>스트릭과 배지</Top.TitleParagraph>} />}>
      <SummaryHero
        label="연속 출석"
        value={<Amount value={streak.current} unit="일" typography="t1" />}
        caption={`최장 ${streak.longest}일 · 누적 미션 ${streak.totalCompletedMissions}개`}
        testId="badge-summary"
      />

      <Spacing size={24} />
      <Paragraph.Text typography="t4">배지</Paragraph.Text>
      <Spacing size={12} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {BADGE_DEFINITIONS.map((badge) => {
          const unlocked = unlockedSet.has(badge.id);
          const unlockedAt = badges.unlockedAt[badge.id];

          return (
            <div
              key={badge.id}
              data-testid="badge-card"
              data-badge-id={badge.id}
              data-unlocked={unlocked ? 'true' : 'false'}
              onClick={() => handleCardTap(badge.name, unlocked, unlockedAt, badge.condition)}
              style={{ cursor: 'pointer', minHeight: 44 }}
            >
              <Card>
                <Asset.ContentIcon name={badge.icon} alt={badge.name} style={{ width: 28, height: 28 }} />
                <Spacing size={8} />
                <Paragraph.Text typography="st11" color={unlocked ? undefined : 'tertiary'}>
                  {badge.name}
                </Paragraph.Text>
                <Spacing size={2} />
                <Paragraph.Text typography="st13" color="tertiary">
                  {unlocked && unlockedAt ? formatUnlockedDate(unlockedAt) : describeBadgeCondition(badge.condition)}
                </Paragraph.Text>
                <Spacing size={8} />
                <Chip variant={unlocked ? 'fill' : 'weak'}>{unlocked ? '획득' : '잠김'}</Chip>
              </Card>
            </div>
          );
        })}
      </div>

      <Spacing size={24} />

      <Button variant="weak" display="block" onClick={() => navigate('/')}>
        홈으로
      </Button>

      <Spacing size={96} />

      <Toast
        open={toastMessage !== null}
        position="bottom"
        text={toastMessage ?? ''}
        onClose={() => setToastMessage(null)}
      />
    </ScreenScaffold>
  );
}
