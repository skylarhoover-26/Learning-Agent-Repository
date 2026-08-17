// The XP / badge / streak RULES, with no storage attached.
//
// These rules used to live inside lib/progression.js, which reads and writes
// localStorage through learner-store — so they could only ever run in a browser.
// That was fine while the browser was the only place a learner could earn
// anything. It stops being fine the moment a lesson can be completed in Slack:
// either the server grows its own second copy of "what a Quick Lesson is worth"
// (two sets of numbers, guaranteed to drift), or the rules move somewhere both
// sides can call. This is that somewhere.
//
// Everything here is a PURE function of a ledger snapshot:
//   state = { xpEvents: [], lessons: [], badges: [] }
// The `plan*` functions decide what SHOULD be written and return it; they never
// write. Two adapters apply the result:
//   lib/progression.js        — localStorage (the web app)
//   lib/progression-server.js — blob + Supabase (Slack, crons, admin)
//
// XP event ids are deliberately NOT set here. Each adapter's append path mints
// them, which is how the browser already worked (learner-store.addXpEvent) — so
// keeping it that way means the client's stored shape doesn't change at all.

import { getLevel } from './level-curve';
import { contentDayKey } from './content-day';

// XP amounts, tiered so reward maps to effort. Lesson awards below are the
// MAXIMUM for a perfect (100% correct) attempt — actual award is scaled by
// correctness in planLessonComplete (see LESSON_MAX_XP). Quick tips are
// completion-only and always award their full amount.
export const XP_AMOUNTS = {
  first_login: 25,    // one-time, awarded once on first login
  chat_message: 2,    // trickle; capped per day (see DAILY_CAPS)
  quick_tip: 15,      // completion-only, no correctness gate
  quick_lesson: 40,   // max; scaled by correctness
  deep_dive: 100,     // max; scaled by correctness
  quest_complete: 200,
  streak_day: 10,
  goal_added: 5,
  project_added: 5,
  // One-time, for finding every hidden capybara. Priced between a deep dive and
  // a quest: it takes longer than any single lesson but it isn't learning.
  capybara_collection: 150,
};

// Game XP is tiered by difficulty and scaled by how well you did. The base is
// the MOST you can earn from a game (a perfect run); the actual award is
// round(base * scoreFraction).
const GAME_XP_BY_DIFFICULTY = { easy: 20, medium: 35, hard: 50 };

// Every game slug must be listed here. An unlisted game silently falls back to
// 'easy', which is how the five generated-round games (Family Feud, Jeopardy,
// Millionaire, Two Truths, Wheel of Fortune) were all quietly worth 20 XP.
const GAME_DIFFICULTY = {
  'speed-round': 'easy',
  // Retired from the games hub (replaced by Lily Leap) but KEPT here: past plays are
  // in people's history, and an unlisted slug silently resolves to 'easy', which is
  // how five games were quietly worth 20 XP once already.
  'ai-or-human': 'easy',
  'lily-leap': 'easy',
  'two-truths': 'easy',
  'wheel-of-fortune': 'easy',
  'prompt-battle': 'medium',
  'family-feud': 'medium',
  jeopardy: 'medium',
  millionaire: 'medium',
  'build-the-flow': 'medium',
  // Hard alongside Hallucination Hunt: precision matters, and over-redacting costs
  // you as much as missing something.
  'redact-it': 'hard',
  'hallucination-hunt': 'hard',
};

// The max XP a given game can award (its difficulty base). Used by the games
// hub to show "Chance to win up to X XP".
export function maxGameXp(gameSlug) {
  return GAME_XP_BY_DIFFICULTY[GAME_DIFFICULTY[gameSlug] || 'easy'];
}

export function gameDifficulty(gameSlug) {
  return GAME_DIFFICULTY[gameSlug] || 'easy';
}

// Per-lesson-type maximum XP, keyed by the lesson `format`/`type` strings the
// lesson flow uses. 'standard' is the in-app name for a Quick Lesson.
export const LESSON_MAX_XP = {
  quick_tip: XP_AMOUNTS.quick_tip,
  standard: XP_AMOUNTS.quick_lesson,
  quick_lesson: XP_AMOUNTS.quick_lesson,
  deep_dive: XP_AMOUNTS.deep_dive,
  project_quest: XP_AMOUNTS.quest_complete,
};

// Daily caps on spammable sources. `count` = how many awarding events per day
// actually earn XP; events beyond that award 0.
export const DAILY_CAPS = {
  chat_message: 5,
  review_correct: 20,  // spaced-repetition is mostly self-limiting; generous cap
  // Quick tips are completion-only with no correctness gate, and a new topic pays
  // full every time — so without a ceiling a learner can churn topics for 15 XP
  // each indefinitely. Cap the number that PAY per content-day; tips past the cap
  // still generate and still record (learning is never blocked, only farming).
  quick_tip: 5,
};

// Graded lessons (Quick Lesson / Deep Dive / Project Quest) award XP ONLY when
// the learner PASSES — finishing without passing earns nothing. Passing on a
// later retake tops the award up to the full amount (never beyond it).
export const PASS_THRESHOLD = 0.7;   // fraction of activities/quiz correct to "pass"

// ── Derived reads ────────────────────────────────────────────────────────────

export function getTotalXp(xpEvents) {
  // XP never displays negative (admin deducts are floored at 0).
  return Math.max(0, (xpEvents || []).reduce((sum, e) => sum + (e.amount || 0), 0));
}

// Gather every timestamp that counts as a day of activity for the streak. An
// active day is any day the learner earned XP (a lesson, game, quick tip, chat,
// quest, or goal/project) OR completed a lesson (repeats award no XP but still
// keep the streak alive). This is broader than lessons-only so the streak
// reflects real daily engagement, not just completed lessons.
export function activityTimestamps(xpEvents = [], lessons = []) {
  const out = [];
  for (const e of xpEvents) if (e?.created_at) out.push(e.created_at);
  for (const l of lessons) if (l?.completed_at) out.push(l.completed_at);
  return out;
}

// Which calendar day a moment belongs to, always in Pacific time.
//
// This used to be `d.setHours(0, 0, 0, 0)` — local midnight on whatever machine
// happened to be running. That is the learner's own timezone in the browser and
// UTC on Vercel, so the app and the Slack DM bucketed the same ledger into
// different days and reported streaks that differed by one (feedback #200:
// "Slack says 3 days, the app shows 4"). Anyone active in the late afternoon or
// evening Pacific was already into the next UTC day, which is why it showed up
// as an off-by-one rather than as noise.
//
// Pinning to America/Los_Angeles makes the number identical everywhere it is
// computed. It also matches how the rest of the app defines a day (see
// contentDayKey in lib/content-day.js, which anchors to Pacific too).
const PACIFIC_DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});

// 'YYYY-MM-DD' for the Pacific calendar day containing `date`.
function pacificDayKey(date) {
  return PACIFIC_DAY_FMT.format(date);
}

// The day key `days` before/after `key`, done on a UTC calendar so it can't be
// dragged around by a DST shift in the host's own zone.
function shiftDayKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// Count consecutive days (up to and including today, or ending yesterday) that
// have at least one activity timestamp. Any time on a day counts once.
export function calculateStreak(timestamps) {
  if (!timestamps?.length) return 0;

  const days = new Set();
  timestamps.forEach((ts) => {
    if (!ts) return;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return;
    days.add(pacificDayKey(d));
  });
  if (!days.size) return 0;

  // Nothing today doesn't break the streak — it may still be running and end
  // yesterday. Nothing yesterday either, and it's over.
  let cursor = pacificDayKey(new Date());
  if (!days.has(cursor)) cursor = shiftDayKey(cursor, -1);

  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}

// Streak straight from a ledger snapshot — the shape both adapters and the
// Slack DM want, without each one re-deriving the timestamp union.
export function streakFromState(state) {
  return calculateStreak(activityTimestamps(state?.xpEvents || [], state?.lessons || []));
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
// Used to enforce DAILY_CAPS on spammable sources (chat, review).
function countTodayBySource(xpEvents, source) {
  const todayIso = new Date().toISOString();
  return (xpEvents || []).filter(
    e => e.source === source && isSameDay(e.created_at, todayIso)
  ).length;
}

export function normalizeTopic(topic) {
  return (topic || '').trim().toLowerCase();
}

// Count distinct lesson topics in history, so lesson-count badges (3/10 lessons)
// reflect real learning and can't be farmed by repeating one lesson.
function distinctTopicCount(lessons) {
  return new Set((lessons || []).map(l => normalizeTopic(l.topic)).filter(Boolean)).size;
}

// How many quick tips have actually PAID today, counting both entry points (a
// chosen-topic tip and a "Surprise me" tip). Shared by the award path and the
// pre-completion UI so the two can never drift on what "at the cap" means.
function paidQuickTipsToday(xpEvents) {
  const todayKey = contentDayKey();
  return (xpEvents || []).filter((e) => {
    const isTip = e.source === 'surprise_tip'
      || (e.source === 'lesson_complete' && e.meta?.format === 'quick_tip');
    return isTip && contentDayKey(new Date(e.created_at)) === todayKey;
  }).length;
}

// Is this learner already at the quick-tip daily cap? Needed BEFORE the lesson is
// submitted — otherwise the finish button promises "earn XP" for a tip the cap
// will pay nothing for.
export function quickTipCapReachedFor(xpEvents) {
  return paidQuickTipsToday(xpEvents) >= DAILY_CAPS.quick_tip;
}

const BADGE_TRIGGERS = {
  first_lesson: (ctx) => ctx.lessonCount >= 1,
  three_lessons: (ctx) => ctx.lessonCount >= 3,
  ten_lessons: (ctx) => ctx.lessonCount >= 10,
  three_day_streak: (ctx) => ctx.streak >= 3,
  seven_day_streak: (ctx) => ctx.streak >= 7,
  level_5: (ctx) => ctx.level >= 5,
  level_10: (ctx) => ctx.level >= 10,
  level_25: (ctx) => ctx.level >= 25,
  level_50: (ctx) => ctx.level >= 50,
  first_game: (ctx) => ctx.gamesPlayed >= 1,
  five_games: (ctx) => ctx.gamesPlayed >= 5,
  first_quiz: (ctx) => ctx.quizCorrect >= 1,
  quiz_master: (ctx) => ctx.quizCorrect >= 10,
};

// Which badges this learner has newly qualified for. Pure: returns ids, the
// adapter records them.
function newBadgeIds({ badges, lessons, lessonCount, streak, level, gamesPlayed = 0 }) {
  const earnedIds = new Set((badges || []).map(b => b.badge_id));
  // Total correct quiz answers across all lessons (stored per lesson record).
  const quizCorrect = (lessons || []).reduce((s, l) => s + (l.quiz_correct || 0), 0);
  const ctx = { lessonCount, streak, level, gamesPlayed, quizCorrect };
  const out = [];
  for (const [badgeId, check] of Object.entries(BADGE_TRIGGERS)) {
    if (!earnedIds.has(badgeId) && check(ctx)) out.push(badgeId);
  }
  return out;
}

// Normalize whatever an adapter hands us into a full ledger snapshot.
function readState(state) {
  return {
    xpEvents: Array.isArray(state?.xpEvents) ? state.xpEvents : [],
    lessons: Array.isArray(state?.lessons) ? state.lessons : [],
    badges: Array.isArray(state?.badges) ? state.badges : [],
  };
}

// The shared tail of every award: given the ledger AFTER the new entries, work
// out totals, level movement, streak and badges. `awarded` is the XP this action
// added, so the pre-action level can be derived to detect a level-up.
function settle({ xpEvents, lessons, badges }, awarded, badgeOptions = {}) {
  const streak = calculateStreak(activityTimestamps(xpEvents, lessons));
  const totalXp = getTotalXp(xpEvents);
  const level = getLevel(totalXp);
  const prevLevel = getLevel(Math.max(0, totalXp - awarded));
  const badgeIds = newBadgeIds({
    badges,
    lessons,
    lessonCount: badgeOptions.lessonCount ?? distinctTopicCount(lessons),
    streak,
    level,
    gamesPlayed: badgeOptions.gamesPlayed || 0,
  });
  return { streak, totalXp, level, leveledUp: level > prevLevel, badgeIds };
}

// ── Award planning ───────────────────────────────────────────────────────────
// Each plan* returns { xpEvents, lessonRecord, badgeIds, result }:
//   xpEvents     — events to append, in order, WITHOUT ids (the adapter mints them)
//   lessonRecord — a lesson-history row to append, or null
//   badgeIds     — badge ids to record
//   result       — what the UI/DM shows (award, totals, level-up, streak, …)

// Complete a lesson.
//   options.format      — 'quick_tip' | 'standard' | 'quick_lesson' | 'deep_dive'
//   options.correctness — 0..1 fraction of exercises answered correctly.
//                         Defaults to 1 (full). Ignored for quick_tip, which is
//                         completion-only.
//
// Rules:
//   - Repeating a topic you already completed awards 0 XP (no double XP), but
//     still records the lesson so your streak keeps counting.
//   - Otherwise XP = round(maxForType * correctness); quick tips always pay full.
export function planLessonComplete(state, topic, startedAt, options = {}) {
  const { xpEvents, lessons, badges } = readState(state);
  const now = options.now || new Date().toISOString();
  const format = options.format || 'quick_lesson';
  const maxXp = LESSON_MAX_XP[format] ?? XP_AMOUNTS.quick_lesson;

  // Quick tips are completion-only (no quiz): full amount once per topic.
  // Graded formats use the pass model — nothing for finishing short of the bar,
  // and a later passing retake tops up to the full amount (capped at the max,
  // never paid twice for the same passed lesson).
  let correctness;
  let award;
  let isRepeat;
  let passed;
  // Why a quick tip earned nothing, so the completion screen can say so instead
  // of claiming "XP earned". Only true when the cap is the actual reason — a
  // repeat topic already has its own message.
  let dailyCapReached = false;

  if (format === 'quick_tip') {
    correctness = 1;
    passed = true;
    isRepeat = lessons.some(l => normalizeTopic(l.topic) === normalizeTopic(topic));
    const atDailyCap = quickTipCapReachedFor(xpEvents);
    dailyCapReached = !isRepeat && atDailyCap;
    award = (isRepeat || atDailyCap) ? 0 : maxXp;
  } else {
    correctness = Math.max(0, Math.min(1, options.correctness ?? 1));
    passed = correctness >= PASS_THRESHOLD;
    const samePrior = lessons.filter(
      l => normalizeTopic(l.topic) === normalizeTopic(topic) && (l.format || 'quick_lesson') === format
    );
    isRepeat = samePrior.length > 0;
    const alreadyAwarded = samePrior.reduce((s, l) => s + (l.xp_awarded || 0), 0);
    const everPassed = samePrior.some(l => (l.correctness ?? 0) >= PASS_THRESHOLD);

    if (everPassed) {
      award = 0;                                    // already earned the full amount
    } else if (passed) {
      award = Math.max(0, maxXp - alreadyAwarded);  // pass → top up to the full amount
    } else {
      // Didn't reach the pass bar → NO XP. Passing (>=70%) is the only way to
      // earn XP on a graded lesson; finishing without passing pays nothing.
      award = 0;
    }
  }

  const lessonRecord = {
    id: options.lessonId || `lh_${Date.now()}`,
    learner_id: options.learnerId || null,
    topic,
    format,
    correctness,
    passed,
    quiz_correct: Math.max(0, Math.round(options.quizCorrect || 0)),
    xp_awarded: award,
    repeat: isRepeat,
    started_at: startedAt || now,
    completed_at: now,
    ...(options.source ? { source: options.source } : {}),
  };

  const appended = [];
  if (award > 0) {
    appended.push({
      source: 'lesson_complete',
      amount: award,
      created_at: now,
      meta: { topic, format, correctness, passed, ...(options.source ? { via: options.source } : {}) },
    });
  }

  // Streak day is decided against the ledger as it stands after the lesson.
  const nextLessons = [...lessons, lessonRecord];
  const withLesson = [...xpEvents, ...appended];
  const streakSoFar = calculateStreak(activityTimestamps(withLesson, nextLessons));

  let streakAwarded = false;
  if (streakSoFar >= 2) {
    const alreadyAwardedStreak = withLesson.some(
      e => e.source === 'streak_day' && isSameDay(e.created_at, now)
    );
    if (!alreadyAwardedStreak) {
      appended.push({ source: 'streak_day', amount: XP_AMOUNTS.streak_day, created_at: now });
      streakAwarded = true;
    }
  }

  const nextEvents = [...xpEvents, ...appended];
  const totalAwarded = award + (streakAwarded ? XP_AMOUNTS.streak_day : 0);
  const settled = settle(
    { xpEvents: nextEvents, lessons: nextLessons, badges },
    totalAwarded,
  );

  const badgeIds = [...settled.badgeIds];
  // Project Quests complete through the lesson flow, so the first-quest badge is
  // awarded here (it used to live in the curated quest player).
  if (format === 'project_quest'
    && !badges.some((b) => b.badge_id === 'first_quest')
    && !badgeIds.includes('first_quest')) {
    badgeIds.push('first_quest');
  }

  return {
    xpEvents: appended,
    lessonRecord,
    badgeIds,
    result: {
      xpAwarded: totalAwarded,
      isRepeat,
      passed,
      correctness,
      dailyCapReached,
      maxXp,
      totalXp: settled.totalXp,
      level: settled.level,
      leveledUp: settled.leveledUp,
      streak: settled.streak,
      newBadges: badgeIds,
      source: 'lesson_complete',
      lessonCount: nextLessons.length,
    },
  };
}

// A "Surprise me" quick tip — an auto-picked, completion-only Quick Tip the
// learner didn't choose a topic for, so it can't be gated per-topic like a normal
// lesson. Instead it's capped to the FIRST surprise tip per content-day (same
// 8 AM PT rollover as games). Later ones that day are free but award nothing, and
// deliberately aren't recorded: a one-shot tip has no state worth keeping.
export function planSurpriseTip(state, title, options = {}) {
  const { xpEvents, lessons, badges } = readState(state);
  const now = options.now || new Date().toISOString();

  const todayKey = contentDayKey();
  const alreadyToday = xpEvents.some(
    e => e.source === 'surprise_tip' && contentDayKey(new Date(e.created_at)) === todayKey
  );
  const award = alreadyToday ? 0 : XP_AMOUNTS.quick_tip;

  const appended = [];
  let lessonRecord = null;
  if (!alreadyToday) {
    lessonRecord = {
      id: options.lessonId || `lh_${Date.now()}`,
      learner_id: options.learnerId || null,
      topic: title || 'Surprise quick tip',
      format: 'quick_tip',
      correctness: 1,
      quiz_correct: 0,
      xp_awarded: award,
      repeat: false,
      started_at: now,
      completed_at: now,
    };
    appended.push({ source: 'surprise_tip', amount: award, created_at: now, meta: { title: title || null } });
  }

  const nextLessons = lessonRecord ? [...lessons, lessonRecord] : lessons;
  const settled = settle({ xpEvents: [...xpEvents, ...appended], lessons: nextLessons, badges }, award);

  return {
    xpEvents: appended,
    lessonRecord,
    badgeIds: settled.badgeIds,
    result: {
      xpAwarded: award,
      capped: alreadyToday,
      isRepeat: alreadyToday,
      totalXp: settled.totalXp,
      level: settled.level,
      leveledUp: settled.leveledUp,
      streak: settled.streak,
      newBadges: settled.badgeIds,
      source: 'surprise_tip',
      lessonCount: nextLessons.length,
    },
  };
}

// Complete a game.
//   options.fraction    — 0..1 share of the game answered correctly (default 1).
//   options.gamesPlayed — total games finished across all games (drives badges).
//
// Games are NOT daily-capped: play Family Feud twice and you get credit twice
// (Skylar, 2026-08-11). What keeps it honest is that the award is base × how well
// you did, so a throwaway replay pays close to nothing, and a 0-score run earns 0
// rather than logging an empty event.
export function planGameComplete(state, gameSlug, options = {}) {
  const { xpEvents, lessons, badges } = readState(state);
  const now = options.now || new Date().toISOString();

  const fraction = Math.max(0, Math.min(1, options.fraction ?? 1));
  const gamesPlayed = options.gamesPlayed || 0;
  const base = maxGameXp(gameSlug);
  const award = Math.round(base * fraction);
  const capped = award <= 0;

  // Kept in the result for consumers that want to say "second win today" — it no
  // longer affects the payout.
  const todayKey = contentDayKey();
  const alreadyEarnedToday = xpEvents.some(
    e => e.source === 'game_complete'
      && e.meta?.game === gameSlug
      && contentDayKey(new Date(e.created_at)) === todayKey
  );

  const appended = capped ? [] : [{
    source: 'game_complete',
    amount: award,
    created_at: now,
    meta: { game: gameSlug, fraction },
  }];

  // NOTE: games badge-count off total lessons, not distinct topics — matching the
  // original onGameComplete, which passed lessons.length here while the lesson
  // path passed distinctTopicCount. Preserved deliberately so this refactor
  // doesn't silently hand anyone a badge they hadn't earned before.
  const settled = settle(
    { xpEvents: [...xpEvents, ...appended], lessons, badges },
    capped ? 0 : award,
    { lessonCount: lessons.length, gamesPlayed },
  );

  return {
    xpEvents: appended,
    lessonRecord: null,
    badgeIds: settled.badgeIds,
    result: {
      xpAwarded: capped ? 0 : award,
      capped,
      alreadyEarnedToday,
      maxXp: base,
      fraction,
      totalXp: settled.totalXp,
      level: settled.level,
      leveledUp: settled.leveledUp,
      streak: settled.streak,
      newBadges: settled.badgeIds,
      gamesPlayed,
      source: 'game_complete',
    },
  };
}

// Generic capped, flat-amount award for spammable sources (chat, review). Only
// the first `cap` events of that source per day earn XP; beyond that the action
// still works but awards nothing.
export function planCapped(state, source, amount, cap, options = {}) {
  const { xpEvents } = readState(state);
  const usedToday = countTodayBySource(xpEvents, source);
  if (usedToday >= cap) {
    return {
      xpEvents: [],
      lessonRecord: null,
      badgeIds: [],
      result: { xpAwarded: 0, capped: true, source, remainingToday: 0 },
    };
  }

  const now = options.now || new Date().toISOString();
  const appended = [{ source, amount, created_at: now }];
  const nextEvents = [...xpEvents, ...appended];
  const totalXp = getTotalXp(nextEvents);
  const level = getLevel(totalXp);

  return {
    xpEvents: appended,
    lessonRecord: null,
    badgeIds: [],
    result: {
      xpAwarded: amount,
      capped: false,
      totalXp,
      level,
      leveledUp: level > getLevel(totalXp - amount),
      streak: 0,
      newBadges: [],
      source,
      remainingToday: Math.max(0, cap - usedToday - 1),
    },
  };
}

// One-time "welcome / getting started" bonus. Returns null when it's already been
// paid, so the guard holds across sessions and devices — you can only ever get
// this once.
// Found every hidden capybara. One-time, and idempotent on the XP event exactly
// like planFirstLogin — the guard lives in the ledger, which syncs, so the award
// can't be farmed by clearing local storage or switching devices.
//
// The badge is asserted rather than derived from BADGE_TRIGGERS: those triggers
// read the progression ledger (lessons, streak, level), and "how many easter
// eggs has this person seen" isn't in it. This is the one badge whose condition
// is proven by the caller.
export function planCapybaraCollection(state, options = {}) {
  const { xpEvents, lessons, badges } = readState(state);
  if (xpEvents.some(e => e.source === 'capybara_collection')) return null;

  const now = options.now || new Date().toISOString();
  const amount = XP_AMOUNTS.capybara_collection;
  const appended = [{ source: 'capybara_collection', amount, created_at: now }];

  const alreadyEarned = new Set((badges || []).map(b => b.badge_id));
  const collectorBadge = alreadyEarned.has('capybara_collector') ? [] : ['capybara_collector'];

  // Settle against the ledger WITH the new event so a level-up (and any badge
  // this XP happens to push them over) is caught the same as any other award.
  const settled = settle({ xpEvents: [...xpEvents, ...appended], lessons, badges }, amount);
  const badgeIds = [...collectorBadge, ...settled.badgeIds];

  return {
    xpEvents: appended,
    lessonRecord: null,
    badgeIds,
    result: {
      xpAwarded: amount,
      totalXp: settled.totalXp,
      level: settled.level,
      leveledUp: settled.leveledUp,
      streak: settled.streak,
      newBadges: badgeIds,
      source: 'capybara_collection',
    },
  };
}

export function planFirstLogin(state, options = {}) {
  const { xpEvents } = readState(state);
  if (xpEvents.some(e => e.source === 'first_login')) return null;

  const now = options.now || new Date().toISOString();
  const appended = [{ source: 'first_login', amount: XP_AMOUNTS.first_login, created_at: now }];
  const totalXp = getTotalXp([...xpEvents, ...appended]);

  return {
    xpEvents: appended,
    lessonRecord: null,
    badgeIds: [],
    result: {
      xpAwarded: XP_AMOUNTS.first_login,
      totalXp,
      level: getLevel(totalXp),
      leveledUp: false,
      streak: 0,
      newBadges: [],
      source: 'first_login',
    },
  };
}
