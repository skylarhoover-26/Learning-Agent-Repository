import { setLocal, getLocal } from './sync-store';
import { SKILL_LABELS, SKILL_DEFINITIONS, SKILL_KEYS } from './competencies';
import { measuredCompetencies } from './onboarding-quiz';

const STORAGE_KEY = 'calibration_profile';

// Re-exported so the many call sites that already import these from here keep
// working. The definitions themselves now live in lib/competencies.js, which is
// storage-free and therefore safe to import from server code too.
export { SKILL_LABELS, SKILL_DEFINITIONS, SKILL_KEYS };

export function getCalibrationData() {
  return getLocal(STORAGE_KEY);
}

export function saveCalibrationData(data) {
  const updated = {
    ...data,
    completed_at: new Date().toISOString(),
  };
  setLocal(STORAGE_KEY, updated);
  return updated;
}

export function getCalibrationSkills() {
  const data = getCalibrationData();
  return data?.skills || null;
}

// A dated log of every calibration run so My Calibration can show previous
// scores / a timeline and compare new vs old. Each run: { completed_at, skills,
// selfRating, impact }. Kept alongside the "latest only" calibration_profile.
const HISTORY_KEY = 'calibration_history';

export function appendCalibrationRun(run) {
  const existing = getLocal(HISTORY_KEY);
  const history = Array.isArray(existing) ? existing : [];
  history.push({ ...run, completed_at: run.completed_at || new Date().toISOString() });
  // Keep the log bounded — plenty for a timeline/trend.
  const trimmed = history.slice(-24);
  setLocal(HISTORY_KEY, trimmed);
  return trimmed;
}

export function getCalibrationHistory() {
  const data = getLocal(HISTORY_KEY);
  return Array.isArray(data) ? data : [];
}

export function getSelfRating() {
  const data = getCalibrationData();
  return data?.selfRating || null;
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

// Grade the quiz: for each measured competency, what the learner earned over
// what was actually on offer.
//
// This replaced a moving average that started every competency at a 0.3 baseline
// and blended each answer in at 50%. That math squeezed the whole scale into its
// middle: a perfect run landed at 0.65 ("Strong") and a run of worst-possible
// answers still landed at 0.25 ("Comfortable"), so nobody could ever read as
// Expert or as Beginner no matter how they answered. It also made a score depend
// on question ORDER, since the last answer always counted for half of it.
//
// Earned-over-possible has neither problem. The denominator is what answering
// PERFECTLY would earn — the authored best answer's own weights — so a flawless
// run reads 1.00 across the board.
//
// It is deliberately NOT "the most any option could award". Answers carry small
// side-weights on other competencies, and some of those sit on options that
// aren't the best one. Taking the max across all options would put credit in the
// denominator that a correct answer never earns, so picking a WORSE option could
// raise an unrelated competency. Scoring the quiz right has to be the only way
// to score well on it.
//
// `answers` holds AUTHORED answer indices (see shuffleAnswers) and `scenarios`
// is the authored question set, so the two line up regardless of what order the
// learner saw the options in.
export function calculateSkills(answers, scenarios) {
  const measured = measuredCompetencies(scenarios || []);
  const earned = {};
  const possible = {};

  for (const scenario of scenarios || []) {
    const answerIdx = answers?.[scenario.id];
    if (answerIdx === undefined || answerIdx === null) continue;
    const chosen = scenario.answers?.[answerIdx];
    // Unanswered questions are skipped entirely rather than counted as zero, so
    // an abandoned run grades what was actually answered.
    if (!chosen) continue;

    const ideal = scenario.answers?.[scenario.best];
    if (!ideal) continue;

    for (const key of measured) {
      const onOffer = ideal.scores?.[key] || 0;
      if (onOffer <= 0) continue;
      possible[key] = (possible[key] || 0) + onOffer;
      earned[key] = (earned[key] || 0) + (chosen.scores?.[key] || 0);
    }
  }

  // Only measured competencies appear. Emitting a 0 for the rest would drag down
  // calibrationScore (lib/adaptive-level.js), which averages every value it
  // finds here to seed lesson difficulty.
  const skills = {};
  for (const key of measured) {
    if (possible[key]) skills[key] = clamp01(earned[key] / possible[key]);
  }
  return skills;
}
