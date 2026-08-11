// Where a learner is inside a lesson they are taking in Slack.
//
// The web player keeps this in React state and localStorage; Slack has no state of
// its own, so every button press has to be able to reconstruct "which lesson, which
// step, what have they passed, how many attempts have they used" from storage.
//
// Scoped to one content-day (8 AM PT rollover) and one topic, matching how Today's
// Pick works: a session from yesterday is not resumed, it's replaced.
//
// By design this is NOT shared with the web player's position (Skylar, 2026-08-11):
// finishing in the app after starting in Slack restarts the lesson there. What IS
// shared is the ledger, so a topic can only ever pay XP once no matter how many
// times or places it's completed.

import { getUserData, saveUserData } from '@/lib/blob-store';
import { readDoc, mirrorSave } from '@/lib/supabase-store';
import { contentDayKey } from '@/lib/content-day';

const KEY = 'slack_lesson_session';

// Read the current session, or null when there isn't one for today.
export async function readSession(email) {
  if (!email) return null;
  try {
    let data = await readDoc(email, KEY);
    if (data === null || data === undefined) data = await getUserData(email, KEY);
    const session = data?.data || data;
    if (!session || typeof session !== 'object') return null;
    // A session from a previous content-day is stale — treat it as absent so the
    // learner starts today's pick fresh instead of resuming yesterday's lesson.
    if (session.date !== contentDayKey()) return null;
    return session;
  } catch (error) {
    console.error('readSession failed:', error?.message || error);
    return null;
  }
}

export async function writeSession(email, session) {
  if (!email || !session) return null;
  try {
    await saveUserData(email, KEY, session);
    await mirrorSave(email, KEY, session);
    return session;
  } catch (error) {
    console.error('writeSession failed:', error?.message || error);
    return null;
  }
}

// Start (or restart) a session for a topic. `plan` is stored with the session so
// every later button press renders from the SAME plan the learner started on: the
// pre-gen cache is keyed by content-day and could in principle be regenerated
// mid-lesson, which would renumber the steps under them.
export function newSession({ topic, format = 'standard', plan, channel, toolIds = null }) {
  return {
    date: contentDayKey(),
    topic,
    format,
    channel: channel || null,
    toolIds,
    plan,
    stepIdx: 0,
    // stepId -> true (passed) | false (settled after exhausting attempts)
    resolved: {},
    // stepId -> attempt count
    attempts: {},
    // stepId -> the best score seen, for write activities
    scores: {},
    startedAt: new Date().toISOString(),
    finishedAt: null,
    awarded: null,
  };
}

export async function clearSession(email) {
  if (!email) return;
  // Written as null rather than deleted: the blob delete path lists and deletes by
  // URL, and a null document reads back as "no session" through the same code path
  // an absent one does.
  await writeSession(email, { date: contentDayKey(), cleared: true });
}

// ── Derived reads over a session ─────────────────────────────────────────────

export function sessionSteps(session) {
  return session?.plan?.steps || [];
}

export function currentStep(session) {
  return sessionSteps(session)[session?.stepIdx ?? 0] || null;
}

// Activity steps only — these are what correctness is scored on. `build` steps
// (Project Quests) are treated as activities too, since they're the hands-on work.
export function activitySteps(session) {
  return sessionSteps(session).filter((s) => s.kind === 'activity' || s.kind === 'build');
}

// The fraction of activities passed, which is exactly what the shared rule engine
// wants as `correctness` (>= 0.7 passes, and the award scales with it).
//
// A lesson with NO activities (a Quick Tip is read-only) scores 1: there was
// nothing to get wrong, and the format's own rules decide what it pays.
export function correctnessOf(session) {
  const steps = activitySteps(session);
  if (!steps.length) return 1;
  const passed = steps.filter((s) => session?.resolved?.[s.id] === true).length;
  return passed / steps.length;
}

// How many activities are settled (passed, or out of attempts). Continue unlocks
// on settled, not on passed, so a learner can't be stuck forever on one activity.
export function settledCount(session) {
  const steps = activitySteps(session);
  return steps.filter((s) => session?.resolved?.[s.id] !== undefined).length;
}

export function isLastStep(session) {
  return (session?.stepIdx ?? 0) >= sessionSteps(session).length - 1;
}

// Quiz-correct count for badge context: how many activities they got right.
export function quizCorrectOf(session) {
  return activitySteps(session).filter((s) => session?.resolved?.[s.id] === true).length;
}
