// Adaptive difficulty — pure logic, safe to import on client AND server (no blob,
// no fetch, no DOM). The store (adaptive-store.js) and the server chokepoint
// (auth-helpers.js) both build on these functions.
//
// The idea: lessons should track how the learner is ACTUALLY performing, not just
// the level they declared at onboarding. We keep a rolling 0-100 "performance
// score" that seeds from calibration + declared tier and then moves with every
// graded activity (exponential moving average). From that score we derive:
//   - an "effective tier" the lesson generator targets (may differ from declared)
//   - a performance "band" (reinforce / steady / stretch) for finer prompt nudges

// --- Tunables --------------------------------------------------------------

// Weight of the newest activity score in the moving average. Higher = more
// reactive (a single quiz swings it more); lower = steadier.
export const PERF_ALPHA = 0.35;

// Band thresholds on the 0-100 score. Below REINFORCE_MAX we ease off; at/above
// STRETCH_MIN we push harder; in between we hold steady.
export const REINFORCE_MAX = 45;
export const STRETCH_MIN = 78;

// The difficulty ladder adaptive is allowed to move a learner along. `builder`
// and `developer` are CODER lanes — they describe whether someone writes code,
// which is identity, not skill — so adaptive never moves into or out of them.
export const ADAPTIVE_LADDER = ['beginner', 'practitioner', 'power_user'];

// Nominal 0-100 mastery each declared tier implies before we have any evidence.
const TIER_SEED_SCORE = {
  beginner: 25,
  practitioner: 45,
  power_user: 68,
  builder: 68,
  developer: 82,
};

export function clamp0100(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

// Average calibration skills (each 0-1) into a 0-100 score, or null if there's
// nothing to average.
export function calibrationScore(calibrationSkills) {
  if (!calibrationSkills || typeof calibrationSkills !== 'object') return null;
  const vals = Object.values(calibrationSkills).filter((v) => typeof v === 'number' && isFinite(v));
  if (!vals.length) return null;
  return clamp0100((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

// The starting score before any activities: the declared tier's nominal score,
// blended 50/50 with measured calibration when we have it. This is what makes a
// mis-declared level get corrected from the very first lesson (Phase 3).
export function seedScore({ tier, calibrationSkills }) {
  const base = TIER_SEED_SCORE[tier] ?? 40;
  const cal = calibrationScore(calibrationSkills);
  if (cal == null) return base;
  return clamp0100(base * 0.5 + cal * 0.5);
}

// Fold one new graded activity (0-100) into the rolling score.
export function updateScore(prev, score) {
  const p = typeof prev === 'number' && isFinite(prev) ? prev : 50;
  return clamp0100(p * (1 - PERF_ALPHA) + clamp0100(score) * PERF_ALPHA);
}

export function bandFor(score) {
  const s = clamp0100(score);
  if (s < REINFORCE_MAX) return 'reinforce';
  if (s >= STRETCH_MIN) return 'stretch';
  return 'steady';
}

// The tier a given band implies: the declared tier shifted at most ONE step
// along the safe ladder. Coder lanes (builder/developer) are never moved.
export function tierForBand(declaredTier, band) {
  if (!ADAPTIVE_LADDER.includes(declaredTier)) return declaredTier;
  const idx = ADAPTIVE_LADDER.indexOf(declaredTier);
  if (band === 'stretch') return ADAPTIVE_LADDER[Math.min(ADAPTIVE_LADDER.length - 1, idx + 1)];
  if (band === 'reinforce') return ADAPTIVE_LADDER[Math.max(0, idx - 1)];
  return declaredTier;
}

// The tier lessons should target, given the rolling performance score.
export function effectiveTier(declaredTier, score) {
  return tierForBand(declaredTier, bandFor(score));
}

// A short, learner-facing message when the effective level changes, for a toast /
// notification. Returns null when nothing meaningful changed.
export function levelChangeMessage(fromTier, toTier) {
  if (!fromTier || !toTier || fromTier === toTier) return null;
  const rank = (t) => ADAPTIVE_LADDER.indexOf(t);
  const up = rank(toTier) > rank(fromTier);
  return up
    ? "Nice work — you've been acing this, so we're leveling your lessons up."
    : "We've eased your lessons back a step to help the fundamentals stick — you'll climb again as you go.";
}

// Prompt guidance describing recent performance, so generation fine-tunes depth
// beyond the coarse one-step tier shift. Empty until we have real evidence.
export function adaptiveGuidance(band, samples) {
  if (!samples) return '';
  if (band === 'stretch') {
    return '- ADAPTIVE PERFORMANCE: this learner has been scoring HIGH on recent activities. Push depth — raise the challenge and add a more advanced angle; do not over-explain basics they clearly know.';
  }
  if (band === 'reinforce') {
    return '- ADAPTIVE PERFORMANCE: this learner has been STRUGGLING on recent activities. Slow down — simplify, use smaller steps and more concrete examples, and reinforce the fundamentals before anything advanced.';
  }
  return '- ADAPTIVE PERFORMANCE: this learner is performing on-level. Keep difficulty steady and consistent with their level.';
}
