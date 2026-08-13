// When the AI Impact / competency half of the assessment comes due.
//
// It used to run inside the required onboarding gate, right after the skill quiz.
// That made a new hire's first session ~20 screens long with four essay boxes in
// it, which is what people were reacting to in feedback #207. It now waits a few
// days: long enough that someone has actually used the platform and has something
// real to write about, short enough that managers still get competency scores in
// the first week.

import { getScoringData, isImpactAssessmentSnoozed } from './scoring-store';

export const IMPACT_DELAY_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// Has this person ever been graded on the impact competencies?
export function hasCompletedImpact() {
  const data = getScoringData();
  return !!(data?.detail || data?.scores);
}

// The date the delay counts from: finishing the placement quiz, or — when the
// quiz isn't running — finishing onboarding.
//
// This exists so the impact assessment doesn't depend on the placement quiz.
// It used to key off `calibrated_at` alone, which only the quiz writes, so
// switching the quiz off silently switched impact off too. `onboarded_at` is set
// for everyone who completes onboarding, which is the real "they have started
// using this" moment either way. calibrated_at still wins when it exists, so
// nobody who has already taken the quiz has their clock restarted.
export function impactAnchorAt(profile) {
  return profile?.calibrated_at || profile?.onboarded_at || null;
}

// When their deferred first impact assessment unlocks, or null if we can't tell
// (no anchor date yet — they haven't finished onboarding).
export function impactDueAt(profile) {
  const anchor = impactAnchorAt(profile);
  if (!anchor) return null;
  const base = new Date(anchor).getTime();
  if (!Number.isFinite(base)) return null;
  return new Date(base + IMPACT_DELAY_DAYS * DAY_MS);
}

// Days remaining until it unlocks (0 once it's available).
export function daysUntilImpact(profile) {
  const due = impactDueAt(profile);
  if (!due) return null;
  return Math.max(0, Math.ceil((due.getTime() - Date.now()) / DAY_MS));
}

// True when the deferred first-time impact assessment should be offered: they
// finished the quiz, the delay has elapsed, and they haven't done impact yet.
// Snoozing is deliberately NOT considered here — the home card stays visible
// after a snooze; only the modal respects it (see isFirstImpactPromptDue).
export function isFirstImpactDue(profile) {
  if (!impactAnchorAt(profile)) return false;
  if (hasCompletedImpact()) return false;
  const due = impactDueAt(profile);
  return !!due && Date.now() >= due.getTime();
}

// Same, but for the interrupting modal — which a "remind me later" silences.
export function isFirstImpactPromptDue(profile) {
  return isFirstImpactDue(profile) && !isImpactAssessmentSnoozed();
}
