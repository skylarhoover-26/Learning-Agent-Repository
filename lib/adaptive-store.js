'use client';

// Client-side store for the learner's rolling performance score and earned level.
// Persists through the same localStorage + debounced blob mirror every other
// learner doc uses, so the server can read it by email in getAuthenticatedProfile
// (blob key = type), and it lands in Supabase user_documents with everything else.
import { getLocal, setLocal, hydrate } from './sync-store';
import { getCalibrationSkills } from './calibration-store';
import { seedState, applyActivity, levelChangeMessage, ACTIVITY_WEIGHT } from './adaptive-level';
import { addNotification } from './notifications-store';
import { trackLevelChange } from './track';

const KEY = 'adaptive_level';

export function getAdaptiveState() {
  return getLocal(KEY);
}

export async function hydrateAdaptive() {
  return hydrate(KEY);
}

// Fold one graded activity into the learner's level.
//
//   score   0-100, how they did
//   tier    their DECLARED level, from onboarding — the ceiling for promotion
//           and the seed before there's any history
//   source  'lesson' | 'game' — a game moves the score half as far, and never
//           triggers the repeated-fail demotion on its own
//
// Handles the whole side of this that used to be copy-pasted into the lesson
// page: persisting, notifying the learner, and logging the change. Games call the
// exact same function, so a level move means the same thing wherever it came from.
//
// Returns { state, change } — `change` is null unless the level actually moved.
export function recordActivity(score, { tier, source = 'lesson' } = {}) {
  if (typeof score !== 'number' || !isFinite(score)) return null;
  if (!tier) return null;

  const prev = getLocal(KEY);
  // Seed here rather than inside applyActivity so the starting point can include
  // calibration when the placement quiz has run. With the quiz off there is none,
  // and the declared level is the whole starting point.
  const base = prev && typeof prev.score === 'number'
    ? prev
    : seedState({ tier, calibrationSkills: getCalibrationSkills() });

  const { state, change } = applyActivity(base, {
    score,
    weight: ACTIVITY_WEIGHT[source] ?? 1,
    declaredTier: tier,
  });
  setLocal(KEY, state);

  if (change) {
    const message = levelChangeMessage(change.from, change.to);
    if (message) {
      addNotification({
        type: 'level',
        title: change.direction === 'up' ? 'Your lessons leveled up' : 'Lesson level adjusted',
        detail: message,
        emoji: change.direction === 'up' ? '🚀' : '🎯',
      });
    }
    // A level move should be explainable afterwards rather than something a
    // learner just notices in their lessons one day.
    trackLevelChange({
      from: change.from,
      to: change.to,
      score: state.score,
      samples: state.samples,
      reason: change.reason,
    });
  }

  return { state, change };
}
