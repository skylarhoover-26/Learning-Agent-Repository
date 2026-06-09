import {
  addXpEvent, addBadgeEarned, addLessonRecord,
  getXpEvents, getBadgesEarned, getLessonHistory,
} from './learner-store';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500];

const XP_AMOUNTS = {
  lesson_complete: 50,
  streak_day: 10,
  quest_complete: 100,
  goal_added: 5,
  project_added: 5,
  game_complete: 25,
  chat_message: 5,
};

function getTotalXp(xpEvents) {
  return xpEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
}

function getLevel(totalXp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
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

export function onLessonComplete(learnerId, topic, startedAt) {
  const now = new Date().toISOString();

  addLessonRecord(learnerId, {
    id: `lh_${Date.now()}`,
    learner_id: learnerId,
    topic,
    started_at: startedAt || now,
    completed_at: now,
  });

  addXpEvent(learnerId, {
    source: 'lesson_complete',
    amount: XP_AMOUNTS.lesson_complete,
    created_at: now,
  });

  const lessons = getLessonHistory(learnerId);
  const streak = calculateStreak(lessons);

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
    }
  }

  const allXp = getXpEvents(learnerId);
  const totalXp = getTotalXp(allXp);
  const level = getLevel(totalXp);
  const prevXp = totalXp - XP_AMOUNTS.lesson_complete - (streak >= 2 ? XP_AMOUNTS.streak_day : 0);
  const prevLevel = getLevel(Math.max(0, prevXp));
  const leveledUp = level > prevLevel;

  const newBadges = evaluateNewBadges(learnerId, lessons.length, streak, level);

  return {
    xpAwarded: XP_AMOUNTS.lesson_complete + (streak >= 2 ? XP_AMOUNTS.streak_day : 0),
    totalXp,
    level,
    leveledUp,
    streak,
    newBadges,
    lessonCount: lessons.length,
  };
}

export function onGameComplete(learnerId, gameSlug, gamesPlayed) {
  const now = new Date().toISOString();

  addXpEvent(learnerId, {
    source: 'game_complete',
    amount: XP_AMOUNTS.game_complete,
    created_at: now,
    meta: { game: gameSlug },
  });

  const lessons = getLessonHistory(learnerId);
  const streak = calculateStreak(lessons);
  const allXp = getXpEvents(learnerId);
  const totalXp = getTotalXp(allXp);
  const level = getLevel(totalXp);

  const earned = getBadgesEarned(learnerId);
  const earnedIds = new Set(earned.map(b => b.badge_id));
  const ctx = { lessonCount: lessons.length, streak, level, gamesPlayed };
  const newBadges = [];

  for (const [badgeId, check] of Object.entries(BADGE_TRIGGERS)) {
    if (!earnedIds.has(badgeId) && check(ctx)) {
      addBadgeEarned(learnerId, badgeId);
      newBadges.push(badgeId);
    }
  }

  return {
    xpAwarded: XP_AMOUNTS.game_complete,
    totalXp,
    level,
    newBadges,
    gamesPlayed,
  };
}

export { getTotalXp, getLevel, calculateStreak, LEVEL_THRESHOLDS };
