import { useCallback, useEffect, useState } from "react";
import type {
  CreditProfile,
  MissionLogMap,
  StreakState,
  BadgeState,
  AppFlags,
  SaveResult,
  SimulationResult,
  ScoreSnapshot,
} from "@/lib/types";
import { MISSION_DEFINITIONS, DEFAULT_STREAK, DEFAULT_BADGES, DEFAULT_FLAGS } from "@/lib/constants";
import {
  loadProfile,
  saveProfile,
  loadMissionLogs,
  saveMissionLog,
  loadStreak,
  saveStreak,
  loadBadges,
  saveBadges,
  loadFlags,
  saveFlags,
  loadLastSimulation,
  saveLastSimulation,
  loadScoreHistory,
  upsertSnapshot,
} from "@/lib/repository";
import { computeStreak, STREAK_ATTENDANCE_THRESHOLD } from "@/lib/streak";
import { evaluateBadges } from "@/lib/badges";
import { todayKey } from "@/lib/date";

export type SaveProfileInput = Omit<CreditProfile, "updatedAt">;

interface AppDataState {
  loading: boolean;
  profile: CreditProfile | null;
  scoreHistory: ScoreSnapshot[];
  missionLogs: MissionLogMap;
  streak: StreakState;
  badges: BadgeState;
  flags: AppFlags;
  lastSimulation: SimulationResult | null;
}

interface AppDataActions {
  toggleMission: (missionId: string) => Promise<void>;
  saveProfileAndSnapshot: (input: SaveProfileInput) => Promise<SaveResult>;
  ackDisclaimer: () => Promise<SaveResult>;
  completeOnboarding: () => Promise<SaveResult>;
  recordSimulation: (result: SimulationResult) => Promise<SaveResult>;
}

export function useAppData(): AppDataState & { actions: AppDataActions } {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CreditProfile | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreSnapshot[]>([]);
  const [missionLogs, setMissionLogs] = useState<MissionLogMap>({});
  const [streak, setStreak] = useState<StreakState>(DEFAULT_STREAK);
  const [badges, setBadges] = useState<BadgeState>(DEFAULT_BADGES);
  const [flags, setFlags] = useState<AppFlags>(DEFAULT_FLAGS);
  const [lastSimulation, setLastSimulation] = useState<SimulationResult | null>(null);

  useEffect(() => {
    try {
      setProfile(loadProfile());
    } catch {
      setProfile(null);
    }
    try {
      setScoreHistory(loadScoreHistory());
    } catch {
      setScoreHistory([]);
    }
    try {
      setMissionLogs(loadMissionLogs());
    } catch {
      setMissionLogs({});
    }
    try {
      setStreak(loadStreak());
    } catch {
      // keep default
    }
    try {
      setBadges(loadBadges());
    } catch {
      // keep default
    }
    try {
      setFlags(loadFlags());
    } catch {
      // keep default
    }
    try {
      setLastSimulation(loadLastSimulation());
    } catch {
      setLastSimulation(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, []);

  const toggleMission = useCallback(
    async (missionId: string) => {
      const mission = MISSION_DEFINITIONS.find((m) => m.id === missionId);
      if (!mission) return;

      const date = todayKey();
      const prevLog = missionLogs[date];
      const prevCompleted = prevLog?.completedMissionIds ?? [];
      const wasCompleted = prevCompleted.includes(missionId);

      const nextCompleted = wasCompleted
        ? prevCompleted.filter((id) => id !== missionId)
        : [...prevCompleted, missionId];

      const nextTotalPoints = nextCompleted.reduce((sum, id) => {
        const m = MISSION_DEFINITIONS.find((def) => def.id === id);
        return sum + (m?.points ?? 0);
      }, 0);

      const nextLog = {
        date,
        completedMissionIds: nextCompleted,
        totalPoints: nextTotalPoints,
      };

      const nextLogs: MissionLogMap = { ...missionLogs, [date]: nextLog };
      setMissionLogs(nextLogs);

      try {
        saveMissionLog(nextLog);
      } catch {
        // best-effort; UI reflects optimistic state regardless
      }

      if (nextCompleted.length >= STREAK_ATTENDANCE_THRESHOLD) {
        const now = new Date().toISOString();
        const nextStreak = computeStreak(streak, nextCompleted.length, date);
        const { next: nextBadges } = evaluateBadges(badges, { streak: nextStreak.current }, now);

        setStreak(nextStreak);
        setBadges(nextBadges);

        try {
          saveStreak(nextStreak);
        } catch {
          // best-effort
        }
        try {
          saveBadges(nextBadges);
        } catch {
          // best-effort
        }
      }
    },
    [missionLogs, streak, badges]
  );

  const saveProfileAndSnapshot = useCallback(async (input: SaveProfileInput): Promise<SaveResult> => {
    try {
      const result = saveProfile(input);
      if (!result.ok) return result;

      const now = new Date().toISOString();
      const nextProfile: CreditProfile = { ...input, updatedAt: now };
      setProfile(nextProfile);

      const snapshotResult = upsertSnapshot({ date: todayKey(), score: input.score });
      if (snapshotResult.ok) {
        setScoreHistory(loadScoreHistory());
      }

      return result;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  const ackDisclaimer = useCallback(async (): Promise<SaveResult> => {
    try {
      const nextFlags: AppFlags = { ...flags, disclaimerAckedAt: new Date().toISOString() };
      const result = saveFlags(nextFlags);
      if (result.ok) setFlags(nextFlags);
      return result;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [flags]);

  const completeOnboarding = useCallback(async (): Promise<SaveResult> => {
    try {
      const nextFlags: AppFlags = { ...flags, onboardingDone: true };
      const result = saveFlags(nextFlags);
      if (result.ok) setFlags(nextFlags);
      return result;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [flags]);

  const recordSimulation = useCallback(async (result: SimulationResult): Promise<SaveResult> => {
    try {
      const saveRes = saveLastSimulation(result);
      if (saveRes.ok) setLastSimulation(result);
      return saveRes;
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, []);

  return {
    loading,
    profile,
    scoreHistory,
    missionLogs,
    streak,
    badges,
    flags,
    lastSimulation,
    actions: {
      toggleMission,
      saveProfileAndSnapshot,
      ackDisclaimer,
      completeOnboarding,
      recordSimulation,
    },
  };
}
