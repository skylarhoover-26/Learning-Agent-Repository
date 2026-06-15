'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useProgression } from '@/components/progression-provider';
import { useProfile } from '@/components/profile-provider';
import { computeSkills } from '@/lib/heatmap-data';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';

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
  const today = new Date().toDateString();
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

export default function TodaysPick() {
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

    const dailyPick = generateDailyPick(tierSkills, prog.lessonHistory);
    setPick(dailyPick);
  }, [prog?.isLoaded, prog?.lessonHistory, profile?.tier, levelOverrides]);

  if (!pick) return null;

  return (
    <Link
      href={pick.href}
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-cta-300 hover:shadow-card-hover p-5 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-cta-50 dark:bg-slate-700 ring-1 ring-cta-200 dark:ring-slate-600 flex items-center justify-center text-cta-600 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cta-600 bg-cta-50 px-2 py-0.5 rounded">
              Today&apos;s Pick
            </span>
          </div>
          <h3 className="font-bold text-ink dark:text-slate-200 mb-0.5">{pick.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{pick.description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cta-600 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
      </div>
    </Link>
  );
}
