import { useMemo, useRef } from 'react';
import { Top, Paragraph, Spacing, ListRow, Button, Chip, Border } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { Card } from '../components/Card';
import { AdSlot } from '../components/AdSlot';
import { useAppData } from '../hooks/useAppData';
import { recommendMissions } from '../lib/benchmark';
import { todayKey } from '../lib/date';
import type { DailyMissionLog } from '../lib/types';

const TOTAL_MISSIONS = 6;
const TOTAL_POINTS = 12;

/**
 * S2 홈 대시보드 — 오늘의 신용점수 현황과 미션 진행을 한눈에 보여주는 탭-루트 화면.
 *
 * 추천 미션 목록은 마운트 시점 완료 상태로 한 번만 고정한다(useRef) — 미션을
 * 토글해도 목록에서 사라지지 않고 Chip(완료/하기)만 즉시 갱신된다.
 * FloatingTabBar는 App.tsx 셸이 한 번만 렌더한다 — 여기서 다시 넣지 않는다.
 */
export default function Home() {
  const navigate = useNavigate();
  const { loading, profile, missionLogs, streak, actions } = useAppData();

  const today = todayKey();
  const todayLog: DailyMissionLog = missionLogs[today] ?? {
    date: today,
    completedMissionIds: [],
    totalPoints: 0,
  };

  const initialTodayLogRef = useRef(todayLog);
  const recommended = useMemo(
    () => (profile ? recommendMissions(profile, initialTodayLogRef.current) : []),
    [profile]
  );

  if (loading || !profile) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>ScoreClimb</Top.TitleParagraph>} />}>
        <SummaryHero
          label="내 신용점수"
          value={
            <Paragraph.Text typography="t1" color="tertiary">
              —
            </Paragraph.Text>
          }
          testId="home-hero"
        />
      </ScreenScaffold>
    );
  }

  const done = todayLog.completedMissionIds.length;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>ScoreClimb</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate('/onboarding')}>
              현황 수정
            </Button>
          }
        />
      }
    >
      <SummaryHero
        label="내 신용점수"
        value={<Amount value={profile.score} unit="점" typography="t1" testId="home-score-amount" />}
        caption={`${streak.current}일 연속 미션 달성 중이에요`}
        testId="home-hero"
      />

      <Spacing size={16} />

      <div style={{ display: 'flex', gap: 8 }}>
        <Card style={{ flex: 1 }} testId="home-today-missions-card">
          <ListRow
            contents={
              <ListRow.Texts type="2RowTypeA" top="오늘 미션" bottom={`${done}/${TOTAL_MISSIONS} 완료`} />
            }
          />
        </Card>
        <Card style={{ flex: 1 }} testId="home-today-points-card">
          <ListRow
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="오늘 점수"
                bottom={`${todayLog.totalPoints}/${TOTAL_POINTS}점`}
              />
            }
          />
        </Card>
      </div>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">오늘의 미션</Paragraph.Text>
      <Spacing size={12} />

      <Card testId="home-recommend-card">
        {recommended.map((mission) => {
          const isDone = todayLog.completedMissionIds.includes(mission.id);
          return (
            <ListRow
              key={mission.id}
              data-testid="recommend-mission-row"
              onClick={() => navigate('/missions')}
              contents={
                <ListRow.Texts type="2RowTypeA" top={mission.title} bottom={`+${mission.points}점`} />
              }
              right={
                <Chip
                  variant={isDone ? 'fill' : 'weak'}
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      actions.toggleMission(mission.id);
                    } catch {
                      /* best-effort — UI는 낙관적으로 갱신됨 */
                    }
                  }}
                >
                  {isDone ? '완료' : '하기'}
                </Chip>
              }
            />
          );
        })}
      </Card>

      <Spacing size={16} />

      <Button variant="weak" size="large" display="block" onClick={() => navigate('/missions')}>
        미션 전체 보기
      </Button>

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
