import {
  addXpEvent, addBadgeEarned, addLessonRecord,
  getXpEvents, getBadgesEarned, getLessonHistory,
} from './learner-store';
import { xpForNextLevel, getLevel, getLevelProgress } from './level-curve';

// XP amounts, tiered so reward maps to effort. Lesson awards below are the
// MAXIMUM for a perfect (100% correct) attempt — actual award is scaled by
// correctness in onLessonComplete (see LESSON_MAX_XP). Quick tips are
// completion-only and always award their full amount.
const XP_AMOUNTS = {
  first_login: 25,    // one-time, awarded once on first login
  chat_message: 2,    // trickle; capped per day (see DAILY_CAPS)
  quick_tip: 15,      // completion-only, no correctness gate
  quick_lesson: 40,   // max; scaled by correctness
  deep_dive: 100,     // max; scaled by correctness
  quest_complete: 200,
  game_complete: 25,  // capped per day (see DAILY_CAPS)
  streak_day: 10,
  goal_added: 5,
  project_added: 5,
};

// Per-lesson-type maximum XP, keyed by the lesson `format`/`type` strings the
// lesson flow uses. 'standard' is the in-app name for a Quick Lesson.
const LESSON_MAX_XP = {
  quick_tip: XP_AMOUNTS.quick_tip,
  standard: XP_AMOUNTS.quick_lesson,
  quick_lesson: XP_AMOUNTS.quick_lesson,
  deep_dive: XP_AMOUNTS.deep_dive,
};

// Daily caps on spammable sources. `count` = how many awarding events per day
// actually earn XP; events beyond that award 0.
const DAILY_CAPS = {
  chat_message: 5,
  game_complete: 3,
  review_correct: 20,  // spaced-repetition is mostly self-limiting; generous cap
};

// Level-curve math lives in ./level-curve (xpForNextLevel, getLevel,
// getLevelProgress) so it can be shared with server code without pulling in
// browser storage. Re-exported below for existing importers.

function getTotalXp(xpEvents) {
  return xpEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
}

function calculateStreak(lessons) {
  if (!lessons.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = new Set();
  lessons.forEach((l) => {
    const d = new Date(l.completed_at);
    d.setHours(0, 0, 0, 0);
    dates.add(d.getTime());
  });

  let streak = 0;
  const cursor = new Date(today);
  if (!dates.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isSameDay(dateStr1, dateStr2) {
  const a = new Date(dateStr1);
  const b = new Date(dateStr2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// How many XP events of a given source this learner has already earned *today*.
// Used to enforce DAILY_CAPS on spammable sources (chat, games).
function countTodayBySource(learnerId, source) {
  const todayIso = new Date().toISOString();
  return getXpEvents(learnerId).filter(
    e => e.source === source && isSameDay(e.created_at, todayIso)
  ).length;
}

const BADGE_TRIGGERS = {
  first_lesson: (ctx) => ctx.lessonCount >= 1,
  three_lessons: (ctx) => ctx.lessonCount >= 3,
  ten_lessons: (ctx) => ctx.lessonCount >= 10,
  three_day_streak: (ctx) => ctx.streak >= 3,
  seven_day_streak: (ctx) => ctx.streak >= 7,
  level_5: (ctx) => ctx.level >= 5,
  first_game: (ctx) => ctx.gamesPlayed >= 1,
  five_games: (ctx) => ctx.gamesPlayed >= 5,
};

function evaluateNewBadges(learnerId, lessonCount, streak, level, gamesPlayed = 0) {
  const earned = getBadgesEarned(learnerId);
  const earnedIds = new Set(earned.map(b => b.badge_id));
  const ctx = { lessonCount, streak, level, gamesPlayed };
  const newBadges = [];

  for (const [badgeId, check] of Object.entries(BADGE_TRIGGERS)) {
    if (!earnedIds.has(badgeId) && check(ctx)) {
      addBadgeEarned(learnerId, badgeId);
      newBadges.push(badgeId);
    }
  }

  return newBadges;
}

function normalizeTopic(topic) {
  return (topic || '').trim().toLowerCase();
}

// Count distinct lesson topics in history, so lesson-count badges (3/10 lessons)
// reflect real learning and can't be farmed by repeating one lesson.
function distinctTopicCount(lessons) {
  return new Set(lessons.map(l => normalizeTopic(l.topic)).filter(Boolean)).size;
}

// Complete a lesson.
//   options.format      — 'quick_tip' | 'standard' | 'quick_lesson' | 'deep_dive'
//   options.correctness — 0..1 fraction of exercises answered correctly.
//                         Defaults to 1 (full). Ignored for quick_tip, which is
//                         completion-only. (Wired from the lesson flow in Step 6.)
//
// Rules:
//   - Repeating a topic you already completed awards 0 XP (no double XP), but
//     still records the lesson so your streak keeps counting.
//   - Otherwise XP = round(maxForType * correctness); quick tips always pay full.
export function onLessonComplete(learnerId, topic, startedAt, options = {}) {
  const now = new Date().toISOString();
  const format = options.format || 'quick_lesson';
  const maxXp = LESSON_MAX_XP[format] ?? XP_AMOUNTS.quick_lesson;

  const priorLessons = getLessonHistory(learnerId);
  const isRepeat = priorLessons.some(l => normalizeTopic(l.topic) === normalizeTopic(topic));

  // Quick tips are completion-only; everything else scales by correctness.
  const correctness = format === 'quick_tip'
    ? 1
    : Math.max(0, Math.min(1, options.correctness ?? 1));
  const award = isRepeat ? 0 : Math.round(maxXp * correctness);

  addLessonRecord(learnerId, {
    id: `lh_${Date.now()}`,
    learner_id: learnerId,
    topic,
    format,
    correctness,
    xp_awarded: award,
    repeat: isRepeat,
    started_at: startedAt || now,
    completed_at: now,
  });

  if (award > 0) {
    addXpEvent(learnerId, {
      source: 'lesson_complete',
      amount: award,
      created_at: now,
      meta: { topic, format, correctness },
    });
  }

  const lessons = getLessonHistory(learnerId);
  const streak = calculateStreak(lessons);

  let streakAwarded = false;
  if (streak >= 2) {
    const todayXp = getXpEvents(learnerId);
    const alreadyAwardedStreak = todayXp.some(
      e => e.source === 'streak_day' && isSameDay(e.created_at, now)
    );
    if (!alreadyAwardedStreak) {
      addXpEvent(learnerId, {
        source: 'streak_day',
        amount: XP_AMOUNTS.streak_day,
        created_at: now,
      });
      streakAwarded = true;
    }
  }

  const totalXp = getTotalXp(getXpEvents(learnerId));
  const level = getLevel(totalXp);
  const totalAwarded = award + (streakAwarded ? XP_AMOUNTS.streak_day : 0);
  const prevLevel = getLevel(Math.max(0, totalXp - totalAwarded));
  const leveledUp = level > prevLevel;

  const newBadges = evaluateNewBadges(learnerId, distinctTopicCount(lessons), streak, level);

  return {
    xpAwarded: totalAwarded,
    isRepeat,
    correctness,
    maxXp,
    totalXp,
    level,
    leveledUp,
    streak,
    newBadges,
    source: 'lesson_complete',
    lessonCount: lessons.length,
  };
}

export function onGameComplete(learnerId, gameSlug, gamesPlayed = 0) {
  if (!learnerId) return null;
  const now = new Date().toISOString();

  // Daily cap: only the first DAILY_CAPS.game_complete finishes per day earn XP.
  // You still have to finish the game, and badges still count when capped.
  const cap = DAILY_CAPS.game_complete;
  const usedToday = countTodayBySource(learnerId, 'game_complete');
  const capped = usedToday >= cap;

  if (!capped) {
    addXpEvent(learnerId, {
      source: 'game_complete',
      amount: XP_AMOUNTS.game_complete,
      created_at: now,
      meta: { game: gameSlug },
    });
  }

  const lessons = getLessonHistory(learnerId);
  const streak = calculateStreak(lessons);
  const totalXp = getTotalXp(getXpEvents(learnerId));
  const level = getLevel(totalXp);
  const prevLevel = capped ? level : getLevel(totalXp - XP_AMOUNTS.game_complete);
  const newBadges = evaluateNewBadges(learnerId, lessons.length, streak, level, gamesPlayed);

  return {
    xpAwarded: capped ? 0 : XP_AMOUNTS.game_complete,
    capped,
    totalXp,
    level,
    leveledUp: level > prevLevel,
    streak,
    newBadges,
    gamesPlayed,
    source: 'game_complete',
    remainingToday: Math.max(0, cap - usedToday - (capped ? 0 : 1)),
  };
}

// Generic capped, flat-amount award for spammable sources (chat, review). Only
// the first `cap` events of that source per day earn XP; beyond that the action
// still works but awards nothing.
function awardCapped(learnerId, source, amount, cap) {
  if (!learnerId) return null;
  const usedToday = countTodayBySource(learnerId, source);
  if (usedToday >= cap) {
    return { xpAwarded: 0, capped: true, source, remainingToday: 0 };
  }

  addXpEvent(learnerId, { source, amount, created_at: new Date().toISOString() });

  const totalXp = getTotalXp(getXpEvents(learnerId));
  const level = getLevel(totalXp);
  const prevLevel = getLevel(totalXp - amount);
  return {
    xpAwarded: amount,
    capped: false,
    totalXp,
    level,
    leveledUp: level > prevLevel,
    streak: 0,
    newBadges: [],
    source,
    remainingToday: Math.max(0, cap - usedToday - 1),
  };
}

// Capped chat XP. Only the first DAILY_CAPS.chat_message messages per day earn
// XP; beyond that, chatting is free but awards nothing (anti-farm).
export function onChatMessage(learnerId) {
  return awardCapped(learnerId, 'chat_message', XP_AMOUNTS.chat_message, DAILY_CAPS.chat_message);
}

// Capped XP for a correct spaced-repetition review.
export function onReviewCorrect(learnerId) {
  return awardCapped(learnerId, 'review_correct', 5, DAILY_CAPS.review_correct);
}

// One-time "welcome / getting started" bonus. Idempotent: if a first_login XP
// event already exists for this learner, this does nothing and returns null.
// Because XP events sync to the blob and are re-read on load, the guard holds
// across sessions and devices — you can only ever get this once.
export function awardFirstLoginXp(learnerId) {
  if (!learnerId) return null;
  const events = getXpEvents(learnerId);
  if (events.some(e => e.source === 'first_login')) return null;

  const now = new Date().toISOString();
  addXpEvent(learnerId, {
    source: 'first_login',
    amount: XP_AMOUNTS.first_login,
    created_at: now,
  });

  const totalXp = getTotalXp(getXpEvents(learnerId));
  return {
    xpAwarded: XP_AMOUNTS.first_login,
    totalXp,
    level: getLevel(totalXp),
    leveledUp: false,
    streak: 0,
    newBadges: [],
    source: 'first_login',
  };
}

export {
  getTotalXp,
  getLevel,
  getLevelProgress,
  xpForNextLevel,
  calculateStreak,
  XP_AMOUNTS,
  LESSON_MAX_XP,
  DAILY_CAPS,
};
