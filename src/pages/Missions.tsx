import { useEffect, useRef, useState } from 'react';
import { Top, Paragraph, Spacing, ListRow, Switch, Border, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { useAppData } from '../hooks/useAppData';
import { MISSION_DEFINITIONS } from '../lib/constants';
import { todayKey } from '../lib/date';
import { STREAK_ATTENDANCE_THRESHOLD } from '../lib/streak';

const TOTAL_MISSIONS = MISSION_DEFINITIONS.length;
const TOTAL_POINTS = MISSION_DEFINITIONS.reduce((sum, m) => sum + m.points, 0);

/**
 * 오늘의 미션 — MISSION_DEFINITIONS 6종을 ListRow + Switch 체크리스트로 보여준다.
 *
 * @AI:NOTE 하단 탭바는 App.tsx가 렌더하므로 여기서 다시 넣지 않는다.
 */
export default function Missions() {
  const { loading, missionLogs, streak, actions } = useAppData();

  const today = todayKey();
  const todayLog = missionLogs[today];
  const completedIds = new Set(todayLog?.completedMissionIds ?? []);
  const completedCount = completedIds.size;
  const totalPoints = todayLog?.totalPoints ?? 0;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  const prevCompletedRef = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!hydratedRef.current) {
      // 첫 로드(스토리지 복원) 시점의 완료 개수는 기준값으로만 삼고 토스트를 띄우지 않는다.
      hydratedRef.current = true;
      prevCompletedRef.current = completedCount;
      return;
    }
    if (completedCount >= STREAK_ATTENDANCE_THRESHOLD && prevCompletedRef.current < STREAK_ATTENDANCE_THRESHOLD) {
      setToastMessage(`오늘 출석 완료! 연속 ${streak.current}일이에요`);
    }
    prevCompletedRef.current = completedCount;
  }, [loading, completedCount, streak.current]);

  const handleToggle = (missionId: string) => {
    try {
      Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
    } catch {
      /* WebView 밖에서는 throw — 무시 */
    }
    actions.toggleMission(missionId);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>오늘의 미션</Top.TitleParagraph>} />}>
      <Paragraph.Text typography="st11" color="secondary" data-testid="mission-progress">
        {`오늘 미션 ${completedCount}/${TOTAL_MISSIONS} · ${totalPoints}점 모았어요`}
      </Paragraph.Text>

      <Spacing size={16} />

      {MISSION_DEFINITIONS.map((mission) => (
        <div key={mission.id} data-testid="mission-row" data-mission-id={mission.id} style={{ minHeight: 44 }}>
          <ListRow
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={mission.title}
                bottom={`${mission.description} · +${mission.points}점`}
              />
            }
            right={<Switch checked={completedIds.has(mission.id)} onChange={() => handleToggle(mission.id)} />}
          />
        </div>
      ))}

      <Spacing size={24} />
      <Border />
      <Spacing size={16} />

      <Paragraph.Text typography="st13" color="tertiary">
        미션 3개 이상 완료하면 오늘 출석으로 기록돼요
      </Paragraph.Text>

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
