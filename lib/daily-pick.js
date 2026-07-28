// Shared "Today's Pick" algorithm — the SINGLE source of truth used by both the
// client hook (components/use-todays-pick.js) and the server route
// (app/api/daily-pick/route.js), so a learner sees the exact same pick whether
// it's computed in their browser or pre-computed server-side for the daily Slack
// nudge. Keep this pure: no window/localStorage/fetch — just data in, pick out.

import { computeSkills } from '@/lib/heatmap-data';
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

// Pick from already-computed, tier-filtered skills + lesson history. A stable
// per-day seed keeps everyone's pick fixed for the whole content-day (8 AM PT
// rollover) so the browser and the pre-generated server copy always agree.
function pickFromSkills(skills, lessonHistory) {
  const today = contentDayKey();
  const seededIndex = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const staleSkills = skills
    .filter((s) => s.hasActivity && s.freshness > 30)
    .sort((a, b) => b.freshness - a.freshness);

  if (staleSkills.length > 0) {
    const pick = staleSkills[seededIndex % staleSkills.length];
    return {
      type: 'refresh',
      title: `Refresh: ${pick.name}`,
      description: `It's been ${pick.freshness} days since you practiced this. A quick refresher will keep your skills sharp.`,
      href: `/lesson?topic=${encodeURIComponent(pick.name)}`,
      topic: pick.name,
      cta: 'Start refresher',
    };
  }

  const gapSkills = skills.filter((s) => !s.hasActivity && s.mastery < 30);
  if (gapSkills.length > 0) {
    const pick = gapSkills[seededIndex % gapSkills.length];
    return {
      type: 'new',
      title: `Try: ${pick.name}`,
      description: `This is a gap in your knowledge. A focused lesson here will round out your AI skills.`,
      href: `/lesson?topic=${encodeURIComponent(pick.name)}`,
      topic: pick.name,
      cta: 'Start lesson',
    };
  }

  const recentTopics = (lessonHistory || []).map((l) => l.topic).filter(Boolean);
  const uniqueTopics = [...new Set(recentTopics)];

  if (uniqueTopics.length > 0) {
    const topic = uniqueTopics[seededIndex % uniqueTopics.length];
    return {
      type: 'deepen',
      title: `Go deeper: ${topic}`,
      description: `You've started learning this. Take it further with an advanced lesson.`,
      href: `/lesson?topic=${encodeURIComponent(topic)}`,
      topic,
      cta: 'Continue learning',
    };
  }

  return {
    type: 'start',
    title: 'Start your AI journey',
    description: 'Take your first lesson and discover how AI can help with your daily work.',
    href: '/lesson',
    topic: null,
    cta: 'Pick a topic',
  };
}

// Compute the full pick from raw inputs. Same signals whether the inputs came
// from a browser's localStorage or from Supabase server-side:
//   lessonHistory     — [{ topic, format, correctness, completed_at }, ...]
//   moduleProgress    — { [num]: { completed, sectionsRead, ... } }
//   calibrationSkills — { privacy: 0.4, prompting: 0.6, ... } | null
//   tier              — the learner's experience tier (caps topic difficulty)
//   levelOverrides    — admin skill→level overrides ({} if none)
export function computeDailyPick({ lessonHistory, moduleProgress, calibrationSkills, tier, levelOverrides }) {
  const skills = computeSkills({
    lessonHistory: lessonHistory || [],
    moduleProgress: moduleProgress || {},
    calibrationSkills: calibrationSkills || null,
  });

  const maxRank = TIER_MAX_RANK[tier] ?? 3;
  const overrides = levelOverrides || {};
  const tierSkills = skills.filter((s) => {
    const level = overrides[s.name] || s.level;
    return (LEVEL_RANK[level] ?? 1) <= maxRank;
  });

  return pickFromSkills(tierSkills, lessonHistory);
}
