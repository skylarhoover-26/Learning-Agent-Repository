import {
  DEMO_LEARNER,
  DEMO_LESSON_HISTORY,
  DEMO_GOALS,
  DEMO_PROJECTS,
  DEMO_SKILL_EVALUATIONS,
  DEMO_XP_EVENTS,
  DEMO_BADGES_EARNED,
  DEMO_QUIZ_CARDS,
  DEMO_KNOWLEDGE,
} from './mock-data';
import { getProfile } from './profile';

const BADGES = {
  first_lesson: { id: 'first_lesson', name: 'First Steps', emoji: '🎓', description: 'Complete your first lesson' },
  three_lessons: { id: 'three_lessons', name: 'Getting Going', emoji: '📚', description: 'Complete 3 lessons' },
  ten_lessons: { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓', description: 'Complete 10 lessons' },
  three_day_streak: { id: 'three_day_streak', name: 'On Fire', emoji: '🔥', description: 'Learn 3 days in a row' },
  seven_day_streak: { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡', description: 'Learn 7 days in a row' },
  first_quiz: { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️', description: 'Answer your first quiz question' },
  quiz_master: { id: 'quiz_master', name: 'Quiz Master', emoji: '💯', description: 'Get 10 quiz answers correct' },
  first_quest: { id: 'first_quest', name: 'Quest Champion', emoji: '🏆', description: 'Complete your first project quest' },
  first_project: { id: 'first_project', name: 'Goal Getter', emoji: '🎯', description: 'Add your first work project' },
  first_goal: { id: 'first_goal', name: 'Aim High', emoji: '⭐', description: 'Set your first learning goal' },
  level_5: { id: 'level_5', name: 'Power Learner', emoji: '🚀', description: 'Reach Level 5' },
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500];

export async function getCurrentLearner() {
  try {
    const profile = await getProfile();
    if (profile && profile.id && profile.display_name) {
      return {
        id: profile.id,
        display_name: profile.display_name,
        department: profile.department || '',
        sub_team: profile.sub_team || null,
        tier: profile.tier || 'beginner',
        goal: profile.goal || '',
        total_sessions: 0,
        onboarded_at: profile.onboarded_at || new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      };
    }
  } catch {
    // Fall through to null if cookie read fails
  }
  return null;
}

export function getLessonHistory(learnerId, limit = 50) {
  return DEMO_LESSON_HISTORY
    .filter(l => l.learner_id === learnerId)
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, limit);
}

export function getRecentKnowledge(daysBack = 14, limit = 5) {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  return DEMO_KNOWLEDGE
    .filter(k => k.ingested_at >= cutoff)
    .sort((a, b) => new Date(b.ingested_at) - new Date(a.ingested_at))
    .slice(0, limit);
}

export function getActiveWorkProjects(learnerId) {
  return DEMO_PROJECTS.filter(p => p.learner_id === learnerId && p.status !== 'completed');
}

export function getActiveGoals(learnerId) {
  return DEMO_GOALS.filter(g => g.learner_id === learnerId && g.status === 'active');
}

export function calculateGoalProgressForGoal(learnerId, goal) {
  const since = new Date(goal.created_at).getTime();
  const lessonsAfter = DEMO_LESSON_HISTORY.filter(
    l => l.learner_id === learnerId && new Date(l.completed_at).getTime() >= since
  );
  return Math.min(100, lessonsAfter.length * 10);
}

export function getAggregatedSkills(learnerId) {
  const records = DEMO_SKILL_EVALUATIONS
    .filter(s => s.learner_id === learnerId)
    .sort((a, b) => new Date(b.evaluated_at) - new Date(a.evaluated_at));

  const seen = new Set();
  const latestPerSkill = [];
  for (const r of records) {
    const key = r.skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      latestPerSkill.push(r);
    }
  }

  return {
    strong: latestPerSkill.filter(s => s.level === 'strong'),
    growing: latestPerSkill.filter(s => s.level === 'growing'),
    gap: latestPerSkill.filter(s => s.level === 'gap'),
  };
}

export function getDueCardsCount(learnerId) {
  const now = new Date().toISOString();
  return DEMO_QUIZ_CARDS.filter(c => c.learner_id === learnerId && c.next_review_at <= now).length;
}

export function getTotalXp(learnerId) {
  return DEMO_XP_EVENTS
    .filter(e => e.learner_id === learnerId)
    .reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getLevel(totalXp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLevelProgress(totalXp) {
  const level = getLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || (currentThreshold + 2000);
  const xpIntoLevel = totalXp - currentThreshold;
  const xpForLevel = nextThreshold - currentThreshold;
  return {
    level,
    totalXp,
    currentThreshold,
    nextThreshold,
    xpIntoLevel,
    xpForLevel,
    percent: Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)),
    xpToNext: nextThreshold - totalXp,
  };
}

export function getEarnedBadges(learnerId) {
  const earned = DEMO_BADGES_EARNED.filter(b => b.learner_id === learnerId);
  return earned.map(e => {
    const def = BADGES[e.badge_id];
    return def ? { ...def, earned_at: e.earned_at } : null;
  }).filter(Boolean);
}

export function getAllBadgesWithEarnedStatus(learnerId) {
  const earnedIds = new Set(getEarnedBadges(learnerId).map(b => b.id));
  return Object.values(BADGES).map(b => ({
    ...b,
    earned: earnedIds.has(b.id),
  }));
}
