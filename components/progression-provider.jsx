'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getAllData } from '@/lib/learner-store';
import { getTotalXp, getLevel, getLevelProgress, calculateStreak, awardFirstLoginXp } from '@/lib/progression';
import { useProfile } from '@/components/profile-provider';
import { resolveLearnerId } from '@/lib/learner-id';

const ProgressionContext = createContext(null);

export function useProgression() {
  return useContext(ProgressionContext);
}

function buildStats(learnerId) {
  const { xpEvents, badgesEarned, lessonHistory } = getAllData(learnerId);
  const totalXp = getTotalXp(xpEvents);
  const level = getLevel(totalXp);

  return {
    learnerId,
    xpEvents,
    badgesEarned,
    lessonHistory: lessonHistory.sort(
      (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
    ),
    totalXp,
    level,
    levelProgress: getLevelProgress(totalXp),
    streak: calculateStreak(lessonHistory),
  };
}

const EMPTY = {
  learnerId: null,
  xpEvents: [],
  badgesEarned: [],
  lessonHistory: [],
  totalXp: 0,
  level: 1,
  levelProgress: { level: 1, totalXp: 0, percent: 0, xpToNext: 100 },
  streak: 0,
  isLoaded: false,
  refresh: () => {},
};

export function ProgressionProvider({ children }) {
  const { profile } = useProfile();
  const [data, setData] = useState(EMPTY);
  // Holds a one-time welcome-bonus result so the global XP popup can celebrate
  // it. Cleared once shown.
  const [welcomeBonus, setWelcomeBonus] = useState(null);
  const firstLoginCheckedRef = useRef(null);

  const load = useCallback(() => {
    if (profile) {
      setData({ ...buildStats(resolveLearnerId(profile)), isLoaded: true, refresh: load });
    } else {
      setData({ ...EMPTY, isLoaded: true, refresh: load });
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Award the one-time first-login bonus the first time a learner's profile is
  // available. Guarded per learner here, and idempotent in awardFirstLoginXp,
  // so it can never double-award.
  useEffect(() => {
    if (!profile) return;
    const learnerId = resolveLearnerId(profile);
    if (firstLoginCheckedRef.current === learnerId) return;
    firstLoginCheckedRef.current = learnerId;
    const result = awardFirstLoginXp(learnerId);
    if (result) {
      load();
      setWelcomeBonus(result);
    }
  }, [profile, load]);

  const clearWelcomeBonus = useCallback(() => setWelcomeBonus(null), []);

  const value = { ...data, refresh: load, welcomeBonus, clearWelcomeBonus };

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
}
