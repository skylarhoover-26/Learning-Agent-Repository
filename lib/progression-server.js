// The server's progression adapter — same rules as the browser, different storage.
//
// lib/progression.js reads and writes localStorage; this reads and writes the
// blob + Supabase copies. Both delegate every decision to lib/progression-core.js,
// so "a Quick Lesson is worth 40 XP, scaled by correctness, only on a pass, once
// per topic" is stated in exactly one place. That's what makes XP earned in Slack
// the same XP as the app rather than a second implementation that agrees for now.
//
// Server-only (imports the blob + Supabase stores).
//
// ── A path footgun worth knowing ─────────────────────────────────────────────
// A learner's ledgers live at `users/{email}/lp_xp_{learnerId}.json` — the FOLDER
// is the authenticated email, and the FILENAME embeds the learner id, because the
// filename is really the browser's localStorage key. The two are the same string
// in SSO mode (resolveLearnerId returns profile.id, which is the email), but they
// are not the same *field*. Write to `users/{learnerId}/…` and you get a second,
// invisible ledger that the app never reads. So: folder = email, key = learnerId.

import { getUserData, saveUserData } from '@/lib/blob-store';
import { readDoc, mirrorSave } from '@/lib/supabase-store';
import { mergeLedger } from '@/lib/ledger-merge';
import { getLevelProgress } from '@/lib/level-curve';
import {
  planLessonComplete, planSurpriseTip, planGameComplete, planCapped,
  getTotalXp, streakFromState, XP_AMOUNTS, DAILY_CAPS,
} from '@/lib/progression-core';

// Mirrors learner-store.addXpEvent's id format so events minted here are
// indistinguishable from browser-minted ones in the shared ledger.
function mintEventId() {
  return `xp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function ledgerKeys(learnerId) {
  return {
    xp: `lp_xp_${learnerId}`,
    badges: `lp_badges_${learnerId}`,
    lessons: `lp_lessons_${learnerId}`,
  };
}

// Read one ledger the same way /api/user-data GET does: Supabase first (it holds
// the union of every device's synced entries), blob as the fallback.
async function readLedger(email, dataType) {
  try {
    const fromSupabase = await readDoc(email, dataType);
    if (Array.isArray(fromSupabase)) return fromSupabase;
    const fromBlob = await getUserData(email, dataType);
    return Array.isArray(fromBlob) ? fromBlob : [];
  } catch (error) {
    console.error(`readLedger failed (${dataType}):`, error?.message || error);
    return [];
  }
}

// The full ledger snapshot the rules operate on. `learnerId` defaults to the
// email, which is what resolveLearnerId yields under SSO.
export async function readProgressionState(email, learnerId = email) {
  const keys = ledgerKeys(learnerId);
  const [xpEvents, lessons, badges] = await Promise.all([
    readLedger(email, keys.xp),
    readLedger(email, keys.lessons),
    readLedger(email, keys.badges),
  ]);
  return { xpEvents, lessons, badges };
}

// Append entries to one ledger: re-read, merge by identity, write both copies.
//
// mergeLedger is what keeps this honest against a concurrent browser sync — we
// union rather than overwrite, so the loser of a race still keeps its entries.
// A genuinely simultaneous write can still drop a LESSON record (a single jsonb
// document); XP can't be lost that way, because the Supabase mirror upserts
// events by id and never deletes. Rare enough to accept, documented so it isn't
// a surprise later.
async function appendToLedger(email, dataType, entries) {
  if (!entries?.length) return null;
  const stored = await readLedger(email, dataType);
  const merged = mergeLedger(stored, [...stored, ...entries], dataType);
  await saveUserData(email, dataType, merged);
  await mirrorSave(email, dataType, merged);
  return merged;
}

// Write a core plan to storage. Same order the browser adapter uses: lesson
// record, then XP events, then badges.
async function applyPlan(email, learnerId, plan) {
  if (!plan) return null;
  const keys = ledgerKeys(learnerId);

  if (plan.lessonRecord) {
    await appendToLedger(email, keys.lessons, [{ ...plan.lessonRecord, learner_id: learnerId }]);
  }
  const events = (plan.xpEvents || []).map((e) => ({ ...e, id: mintEventId() }));
  if (events.length) {
    await appendToLedger(email, keys.xp, events);
  }
  if (plan.badgeIds?.length) {
    const earnedAt = new Date().toISOString();
    await appendToLedger(
      email,
      keys.badges,
      plan.badgeIds.map((badge_id) => ({ badge_id, earned_at: earnedAt })),
    );
  }
  return plan.result;
}

// Complete a lesson on the learner's behalf from outside the browser (Slack).
// `options` matches the client's onLessonComplete: { format, correctness,
// quizCorrect } plus `source` ('slack'), which is recorded on the lesson row and
// the XP event's meta so the origin of an award is auditable after the fact.
export async function awardLessonComplete({
  email,
  learnerId = email,
  topic,
  startedAt,
  format = 'standard',
  correctness = 1,
  quizCorrect = 0,
  source = 'slack',
}) {
  if (!email || !topic) return null;
  const state = await readProgressionState(email, learnerId);
  const plan = planLessonComplete(state, topic, startedAt, {
    format, correctness, quizCorrect, source, learnerId,
  });
  return await applyPlan(email, learnerId, plan);
}

export async function awardSurpriseTip({ email, learnerId = email, title }) {
  if (!email) return null;
  const state = await readProgressionState(email, learnerId);
  return await applyPlan(email, learnerId, planSurpriseTip(state, title, { learnerId }));
}

export async function awardGameComplete({ email, learnerId = email, gameSlug, fraction = 1, gamesPlayed = 0 }) {
  if (!email || !gameSlug) return null;
  const state = await readProgressionState(email, learnerId);
  return await applyPlan(email, learnerId, planGameComplete(state, gameSlug, { fraction, gamesPlayed }));
}

// Capped chat XP for a Slack DM exchange. Shares the SAME per-day cap and source
// name as in-app chat, so five messages a day is five messages total across both
// surfaces rather than five in each.
export async function awardChatMessage({ email, learnerId = email }) {
  if (!email) return null;
  const state = await readProgressionState(email, learnerId);
  return await applyPlan(email, learnerId, planCapped(
    state, 'chat_message', XP_AMOUNTS.chat_message, DAILY_CAPS.chat_message,
  ));
}

// Read-only standing: XP, level (+ progress to the next), and the real streak.
// Streak used to be unavailable outside the browser — it's derived from the XP and
// lesson ledgers, which this module can now read — so the daily DM and the Slack
// Home tab can stop working around its absence.
export async function readStanding(email, learnerId = email) {
  const state = await readProgressionState(email, learnerId);
  const totalXp = getTotalXp(state.xpEvents);
  const progress = getLevelProgress(totalXp);
  return {
    totalXp,
    level: progress.level,
    levelProgress: progress,
    streak: streakFromState(state),
    lessonCount: state.lessons.length,
    badgeCount: state.badges.length,
  };
}
