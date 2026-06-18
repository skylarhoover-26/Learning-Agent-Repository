'use client';

import { useState, useEffect } from 'react';
import { useProgression } from '@/components/progression-provider';
import { useProfile } from '@/components/profile-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';
import { contentDayKey } from '@/lib/content-day';

// Don't recommend topics above the learner's level (e.g. RAG to a beginner).
const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };
const TIER_MAX_RANK = {
  beginner: 1,
  practitioner: 2,
  power_user: 3,
  builder: 3,
  developer: 3,
};

function generateDailyPick(skills, lessonHistory) {
  const today = contentDayKey(); // new pick each day at 8 AM PT
  const seededIndex = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const staleSkills = skills
    .filter(s => s.hasActivity && s.freshness > 30)
    .sort((a, b) => b.freshness - a.freshness);

  if (staleSkills.length > 0) {
    const pick = staleSkills[seededIndex % staleSkills.length];
    return {
      type: 'refresh',
      title: `Refresh: ${pick.name}`,
      description: `It's been ${pick.freshness} days since you practiced this. A quick refresher will keep your skills sharp.`,
      href: `/lesson?topic=${encodeURIComponent(pick.name)}`,
      cta: 'Start refresher',
    };
  }

  const gapSkills = skills.filter(s => !s.hasActivity && s.mastery < 30);
  if (gapSkills.length > 0) {
    const pick = gapSkills[seededIndex % gapSkills.length];
    return {
      type: 'new',
      title: `Try: ${pick.name}`,
      description: `This is a gap in your knowledge. A focused lesson here will round out your AI skills.`,
      href: `/lesson?topic=${encodeURIComponent(pick.name)}`,
      cta: 'Start lesson',
    };
  }

  const recentTopics = (lessonHistory || [])
    .map(l => l.topic)
    .filter(Boolean);
  const uniqueTopics = [...new Set(recentTopics)];

  if (uniqueTopics.length > 0) {
    const topic = uniqueTopics[seededIndex % uniqueTopics.length];
    return {
      type: 'deepen',
      title: `Go deeper: ${topic}`,
      description: `You've started learning this. Take it further with an advanced lesson.`,
      href: `/lesson?topic=${encodeURIComponent(topic)}`,
      cta: 'Continue learning',
    };
  }

  return {
    type: 'start',
    title: 'Start your AI journey',
    description: 'Take your first lesson and discover how AI can help with your daily work.',
    href: '/lesson',
    cta: 'Pick a topic',
  };
}

// The personalized "Today's Pick" recommendation (or null while loading).
// Shared by the home card and the sidebar "Today's Pick" redirect so they
// always agree on the same pick.
export function useTodaysPick() {
  const prog = useProgression();
  const { profile } = useProfile();
  const [pick, setPick] = useState(null);
  // Admin-editable skill → level overrides (falls back to code defaults).
  const [levelOverrides, setLevelOverrides] = useState(null);

  useEffect(() => {
    fetch('/api/skill-levels')
      .then(r => (r.ok ? r.json() : { levels: {} }))
      .then(d => setLevelOverrides(d.levels || {}))
      .catch(() => setLevelOverrides({}));
  }, []);

  useEffect(() => {
    if (!prog?.isLoaded || levelOverrides === null) return;

    const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
    const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;

    const skills = computeSkills({
      lessonHistory: prog.lessonHistory,
      moduleProgress,
      calibrationSkills,
    });

    // Only recommend skills at or below the learner's experience level. The
    // skill's level can be overridden by admins; otherwise use the code default.
    const maxRank = TIER_MAX_RANK[profile?.tier] ?? 3;
    const tierSkills = skills.filter(s => {
      const level = levelOverrides[s.name] || s.level;
      return (LEVEL_RANK[level] ?? 1) <= maxRank;
    });

    setPick(generateDailyPick(tierSkills, prog.lessonHistory));
  }, [prog?.isLoaded, prog?.lessonHistory, profile?.tier, levelOverrides]);

  return pick;
}
