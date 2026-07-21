// Client-side store for the learner's rolling performance score. Persists through
// the same localStorage + debounced blob mirror every other learner doc uses, so
// the server can read it by email in getAuthenticatedProfile (blob key = type).
import { getLocal, setLocal, hydrate } from './sync-store';
import { getCalibrationSkills } from './calibration-store';
import { seedScore, updateScore, bandFor } from './adaptive-level';

const KEY = 'adaptive_level';

// Stored shape: { score: 0-100, samples, last_band, updated_at }
export function getAdaptiveState() {
  return getLocal(KEY);
}

export async function hydrateAdaptive() {
  return hydrate(KEY);
}

// Fold one graded activity score (0-100) into the rolling performance score.
// Seeds from calibration + declared tier on the very first activity. Returns
// { state, band, prevBand, bandChanged } so the caller can surface a level-change
// nudge. `tier` is the learner's declared tier (for the first-time seed).
export function recordActivityScore(score, { tier } = {}) {
  if (typeof score !== 'number' || !isFinite(score)) return null;
  const prev = getLocal(KEY);
  const base = prev && typeof prev.score === 'number'
    ? prev.score
    : seedScore({ tier, calibrationSkills: getCalibrationSkills() });
  const prevBand = prev?.last_band ?? bandFor(base);
  const next = updateScore(base, score);
  const band = bandFor(next);
  const state = {
    score: next,
    samples: (prev?.samples || 0) + 1,
    last_band: band,
    updated_at: new Date().toISOString(),
  };
  setLocal(KEY, state);
  return { state, band, prevBand, bandChanged: prevBand !== band };
}
