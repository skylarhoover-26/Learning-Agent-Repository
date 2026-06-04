'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllData } from '@/lib/learner-store';
import { getTotalXp, getLevel, calculateStreak, LEVEL_THRESHOLDS } from '@/lib/progression';
import { getProfileClient } from '@/lib/profile-client';

const ProgressionContext = createContext(null);

export function useProgression() {
  return useContext(ProgressionContext);
}

function buildStats(learnerId) {
  const { xpEvents, badgesEarned, lessonHistory } = getAllData(learnerId);
  const totalXp = getTotalXp(xpEvents);
  const level = getLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || (currentThreshold + 2000);
  const xpIntoLevel = totalXp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;

  return {
    learnerId,
    xpEvents,
    badgesEarned,
    lessonHistory: lessonHistory.sort(
      (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
    ),
    totalXp,
    level,
    levelProgress: {
      level,
      totalXp,
      currentThreshold,
      nextThreshold,
      xpIntoLevel,
      xpForLevel,
      percent: Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)),
      xpToNext: nextThreshold - totalXp,
    },
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
  const [data, setData] = useState(EMPTY);

  const load = useCallback(() => {
    const profile = getProfileClient();
    if (profile?.id) {
      setData({ ...buildStats(profile.id), isLoaded: true, refresh: load });
    } else {
      setData({ ...EMPTY, isLoaded: true, refresh: load });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = { ...data, refresh: load };

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
}
