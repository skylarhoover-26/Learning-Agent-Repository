// The browser's progression adapter.
//
// All the actual RULES (XP amounts, caps, the 70% pass gate, repeat/top-up,
// streaks, badges) live in lib/progression-core.js as pure functions of a ledger
// snapshot. This file is the localStorage half: read the learner's ledgers, ask
// the core what should be written, write it, hand back the result the UI shows.
//
// lib/progression-server.js is the same adapter over blob + Supabase, so a lesson
// finished in Slack earns exactly what the same lesson earns in the app — not
// because two code paths agree, but because there's only one set of rules.
//
// Every export here kept its original signature, so callers didn't change.

import {
  addXpEvent, addBadgeEarned, addLessonRecord,
  getXpEvents, getBadgesEarned, getLessonHistory,
} from './learner-store';
import { xpForNextLevel, getLevel, getLevelProgress } from './level-curve';
import {
  planLessonComplete, planSurpriseTip, planGameComplete, planCapped, planFirstLogin,
  planCapybaraCollection,
  quickTipCapReachedFor, maxGameXp, gameDifficulty, normalizeTopic,
  getTotalXp, calculateStreak, activityTimestamps,
  XP_AMOUNTS, LESSON_MAX_XP, DAILY_CAPS, PASS_THRESHOLD,
} from './progression-core';

// The learner's full ledger snapshot, which is what every rule reads.
function readState(learnerId) {
  return {
    xpEvents: getXpEvents(learnerId),
    lessons: getLessonHistory(learnerId),
    badges: getBadgesEarned(learnerId),
  };
}

// Apply a plan from the core. Order matters and mirrors what the pre-refactor
// code did: the lesson record lands first, then XP events, then badges.
// addXpEvent mints the event id, exactly as before.
function apply(learnerId, plan) {
  if (!plan) return null;
  if (plan.lessonRecord) {
    addLessonRecord(learnerId, { ...plan.lessonRecord, learner_id: learnerId });
  }
  for (const event of plan.xpEvents || []) {
    addXpEvent(learnerId, event);
  }
  for (const badgeId of plan.badgeIds || []) {
    addBadgeEarned(learnerId, badgeId);
  }
  return plan.result;
}

// Is this learner already at the quick-tip daily cap? Exported because the recap
// needs to know BEFORE the lesson is submitted — otherwise the finish button
// promises "earn XP" for a tip the cap will pay nothing for.
export function quickTipCapReached(learnerId) {
  if (!learnerId) return false;
  return quickTipCapReachedFor(getXpEvents(learnerId));
}

export function onLessonComplete(learnerId, topic, startedAt, options = {}) {
  return apply(learnerId, planLessonComplete(readState(learnerId), topic, startedAt, {
    ...options,
    learnerId,
  }));
}

export function onSurpriseTip(learnerId, title) {
  if (!learnerId) return null;
  return apply(learnerId, planSurpriseTip(readState(learnerId), title, { learnerId }));
}

export function onGameComplete(learnerId, gameSlug, options = {}) {
  if (!learnerId) return null;
  return apply(learnerId, planGameComplete(readState(learnerId), gameSlug, options));
}

// Capped chat XP. Only the first DAILY_CAPS.chat_message messages per day earn
// XP; beyond that, chatting is free but awards nothing (anti-farm).
export function onChatMessage(learnerId) {
  if (!learnerId) return null;
  return apply(learnerId, planCapped(
    readState(learnerId), 'chat_message', XP_AMOUNTS.chat_message, DAILY_CAPS.chat_message,
  ));
}

// Capped XP for a correct spaced-repetition review.
export function onReviewCorrect(learnerId) {
  if (!learnerId) return null;
  return apply(learnerId, planCapped(
    readState(learnerId), 'review_correct', 5, DAILY_CAPS.review_correct,
  ));
}

// One-time "welcome / getting started" bonus. Idempotent: if a first_login XP
// event already exists for this learner, this does nothing and returns null.
// Because XP events sync to the blob and are re-read on load, the guard holds
// across sessions and devices — you can only ever get this once.
export function awardFirstLoginXp(learnerId) {
  if (!learnerId) return null;
  return apply(learnerId, planFirstLogin(readState(learnerId)));
}

// Found every hidden capybara. One-time; the guard is an XP event in the synced
// ledger, so clearing local storage or moving devices cannot re-award it.
export function awardCapybaraCollection(learnerId) {
  if (!learnerId) return null;
  return apply(learnerId, planCapybaraCollection(readState(learnerId)));
}

export {
  maxGameXp,
  gameDifficulty,
  normalizeTopic,
  getTotalXp,
  getLevel,
  getLevelProgress,
  xpForNextLevel,
  calculateStreak,
  activityTimestamps,
  getLessonHistory,
  XP_AMOUNTS,
  LESSON_MAX_XP,
  DAILY_CAPS,
  PASS_THRESHOLD,
};
