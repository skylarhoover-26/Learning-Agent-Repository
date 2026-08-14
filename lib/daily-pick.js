// Shared "Today's Pick" algorithm — the SINGLE source of truth used by both the
// client hook (components/use-todays-pick.js) and the server route
// (app/api/daily-pick/route.js), so a learner sees the exact same pick whether
// it's computed in their browser or pre-computed server-side for the daily Slack
// nudge. Keep this pure: no window/localStorage/fetch — just data in, pick out.

import { computeSkills, matchTopicToSkill } from '@/lib/heatmap-data';
import { contentDayKey } from '@/lib/content-day';
import { buildAnchors } from '@/lib/learner-signals';

// Don't recommend topics above the learner's level (e.g. RAG to a beginner).
const LEVEL_RANK = { beginner: 1, intermediate: 2, advanced: 3 };
const TIER_MAX_RANK = {
  beginner: 1,
  practitioner: 2,
  power_user: 3,
  builder: 3,
  developer: 3,
};

// The HEATMAP still decides WHICH skill you get — it's the thing that tracks what
// you've studied, what's gone stale, and what calibration says you're weak at, and
// it keeps getting updated as you learn. What the learner's own signals do is
// rewrite that skill into their work: "Bias & Fairness" becomes "Bias & Fairness
// for training content creation".
//
// The rewrite is verified, not assumed. Completing a lesson credits a skill by
// keyword-matching its topic (matchTopicToSkill), so a reframed wording that
// happened to match a different skill would update the wrong square and quietly
// corrupt the heatmap that chose it. When that check fails we keep the plain skill
// name — an unframed pick is a much smaller loss than broken tracking.
function reframeSkill(skillName, profile, seed) {
  const anchors = buildAnchors(profile);
  if (!anchors.length) return { topic: skillName, anchor: null };

  // Offset by the skill name so two different skills on consecutive days don't
  // both land on the learner's first task.
  const offset = skillName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const anchor = anchors[(seed + offset) % anchors.length];
  const topic = `${skillName} for ${anchor.phrase}`;
  // The invariant is "no worse than the unframed pick", NOT "matches this skill".
  // All 17 skill names credit themselves now that matchTopicToSkill scores by
  // specificity, so in practice these are the same test — but comparing against
  // the unframed pick is the honest way to state what we actually care about:
  // reframing must never move which square gets credited.
  if (matchTopicToSkill(topic) !== matchTopicToSkill(skillName)) {
    return { topic: skillName, anchor: null };
  }
  return { topic, anchor };
}

// The "why this, for me" half of the pick's description.
function anchorReason(anchor) {
  if (!anchor) return null;
  if (anchor.kind === 'goal') return `This is a step toward your goal: ${anchor.label}.`;
  if (anchor.kind === 'project') return `Built around your project: ${anchor.label}.`;
  return `Built around your work on ${anchor.label}.`;
}

// Pick from already-computed, tier-filtered skills + lesson history. A stable
// per-day seed keeps everyone's pick fixed for the whole content-day (8 AM PT
// rollover) so the browser and the pre-generated server copy always agree.
function pickFromSkills(skills, lessonHistory, profile) {
  const today = contentDayKey();
  const seededIndex = today.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const staleSkills = skills
    .filter((s) => s.hasActivity && s.freshness > 30)
    .sort((a, b) => b.freshness - a.freshness);

  if (staleSkills.length > 0) {
    const pick = staleSkills[seededIndex % staleSkills.length];
    const { topic, anchor } = reframeSkill(pick.name, profile, seededIndex);
    return {
      type: 'refresh',
      title: `Refresh: ${topic}`,
      description: [
        `It's been ${pick.freshness} days since you practiced this.`,
        anchorReason(anchor) || 'A quick refresher will keep your skills sharp.',
      ].join(' '),
      href: `/lesson?topic=${encodeURIComponent(topic)}`,
      topic,
      skill: pick.name,
      cta: 'Start refresher',
    };
  }

  const gapSkills = skills.filter((s) => !s.hasActivity && s.mastery < 30);
  if (gapSkills.length > 0) {
    const pick = gapSkills[seededIndex % gapSkills.length];
    const { topic, anchor } = reframeSkill(pick.name, profile, seededIndex);
    return {
      type: 'new',
      title: `Try: ${topic}`,
      description: [
        'This is a gap in your knowledge.',
        anchorReason(anchor) || 'A focused lesson here will round out your AI skills.',
      ].join(' '),
      href: `/lesson?topic=${encodeURIComponent(topic)}`,
      topic,
      skill: pick.name,
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
//   profile           — the learner, ideally with `work_projects` attached. Does
//                       NOT choose the skill; it reframes the chosen one into
//                       their tasks, goals and projects.
export function computeDailyPick({ lessonHistory, moduleProgress, calibrationSkills, tier, levelOverrides, profile }) {
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

  return pickFromSkills(tierSkills, lessonHistory, profile);
}
