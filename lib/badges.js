'use client';

// Shared badge metadata (id → display name + emoji). Mirrors the maps inlined in
// xp-toast and live-level-badges; centralized here so non-UI code (e.g. the
// notifications store) can resolve a badge's friendly name without importing a
// React component.
export const BADGE_META = {
  first_lesson: { id: 'first_lesson', name: 'First Steps', emoji: '🎓' },
  three_lessons: { id: 'three_lessons', name: 'Getting Going', emoji: '📚' },
  ten_lessons: { id: 'ten_lessons', name: 'Bookworm', emoji: '🤓' },
  three_day_streak: { id: 'three_day_streak', name: 'On Fire', emoji: '🔥' },
  seven_day_streak: { id: 'seven_day_streak', name: 'Unstoppable', emoji: '⚡' },
  first_quiz: { id: 'first_quiz', name: 'Pop Quiz', emoji: '✏️' },
  quiz_master: { id: 'quiz_master', name: 'Quiz Master', emoji: '💯' },
  first_quest: { id: 'first_quest', name: 'Quest Champion', emoji: '🏆' },
  first_project: { id: 'first_project', name: 'Goal Getter', emoji: '🎯' },
  first_goal: { id: 'first_goal', name: 'Aim High', emoji: '⭐' },
  first_game: { id: 'first_game', name: 'Game On', emoji: '🎮' },
  five_games: { id: 'five_games', name: 'High Scorer', emoji: '🕹️' },
  level_5: { id: 'level_5', name: 'Power Learner', emoji: '🚀' },
  level_10: { id: 'level_10', name: 'Double Digits', emoji: '🔟' },
  level_25: { id: 'level_25', name: 'Quarter Way', emoji: '🌟' },
  level_50: { id: 'level_50', name: 'Halfway Hero', emoji: '🏔️' },
};

export function badgeMeta(id) {
  return BADGE_META[id] || { id, name: id, emoji: '🏅' };
}
