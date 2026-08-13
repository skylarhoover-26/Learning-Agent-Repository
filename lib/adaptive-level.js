// Adaptive difficulty — pure logic, safe to import on client AND server (no blob,
// no fetch, no DOM). The store (adaptive-store.js) and the server chokepoint
// (auth-helpers.js) both build on these functions.
//
// The idea: lessons should track how the learner is ACTUALLY performing, not just
// the level they declared at onboarding. We keep a rolling 0-100 "performance
// score" that seeds from the declared level (plus calibration, when the placement
// quiz is running) and then moves with every graded activity.
//
// WHAT CHANGED, and why it matters:
//
// The earned level used to be computed fresh every read as "declared tier, shifted
// at most one rung by the current band". That cannot express someone drifting two
// rungs from where they declared, and it re-derives from the declaration forever —
// so a self-declared Developer who is plainly not one could never be moved to
// where they actually are. The earned tier is now STORED and moves one step at a
// time from wherever it currently sits.
//
// The guardrails, which are the whole design:
//
//   - Nobody moves on one activity. A move needs MIN_EVIDENCE lesson-equivalents
//     behind it and a band that has HELD for BAND_STREAK_REQUIRED activities,
//     then the level is frozen for COOLDOWN_ACTIVITIES so it can't oscillate.
//   - Except downward, on repeated failure. Fail an activity, retry it, fail it
//     again and you drop a rung immediately — that pattern is not noise, and
//     making someone sit through two more lessons pitched over their head to
//     "prove" it is the wrong way to treat it. The cooldown still applies after
//     it, so a bad afternoon costs one rung and not the whole ladder.
//   - Climbing is capped by evidence. Anyone can be moved DOWN the full ladder,
//     including out of Builder and Developer. Nobody is promoted ABOVE Power User
//     on general performance, because acing lessons is not evidence you write
//     code — but someone who declared Builder or Developer and was moved down can
//     always climb back to what they declared.
//   - Up is always slow. There is deliberately no fast path upward.

// --- Tunables --------------------------------------------------------------

// Weight of the newest activity score in the moving average. Higher = more
// reactive (a single quiz swings it more); lower = steadier.
export const PERF_ALPHA = 0.35;

// Band thresholds on the 0-100 score. Below REINFORCE_MAX we ease off; at/above
// STRETCH_MIN we push harder; in between we hold steady.
export const REINFORCE_MAX = 45;
export const STRETCH_MIN = 78;

// Anything under this is a fail. Matches the lesson pass bar (70%), so "failed
// it twice" here means the same thing it means to the learner.
export const FAIL_SCORE = 70;

// Evidence required before a normal move, counted in LESSON-EQUIVALENTS rather
// than raw activity count. Four lessons clears it; so do eight games, since a
// game is worth half. Counting raw activities instead let four game rounds move
// someone's level, which is not what "four graded activities" was meant to mean.
export const MIN_EVIDENCE = 4;
export const BAND_STREAK_REQUIRED = 2;
export const COOLDOWN_ACTIVITIES = 3;

// Consecutive full-weight fails that drop a rung on the spot.
export const FAST_FAIL_STREAK = 2;

// How much a game counts relative to a lesson. A game round is real evidence but
// weaker: it's shorter, more luck-tolerant, and often replayed for XP.
export const ACTIVITY_WEIGHT = {
  lesson: 1,
  game: 0.5,
};

// The full difficulty ladder, in order.
export const FULL_LADDER = ['beginner', 'practitioner', 'power_user', 'builder', 'developer'];

// The highest rung general performance can promote someone to. Builder and
// Developer describe writing code; a run of strong lesson scores is not evidence
// of that, so they're only reachable by declaring them.
export const PROMOTION_CEILING = 'power_user';

// Kept as the old export name — other modules import it — but it is no longer
// the only ladder anyone can move on. Demotion uses FULL_LADDER.
export const ADAPTIVE_LADDER = FULL_LADDER;

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

function rank(tier) {
  const i = FULL_LADDER.indexOf(tier);
  return i < 0 ? 0 : i;
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
// blended 50/50 with measured calibration when we have it. With the placement
// quiz switched off there is no calibration, so the declared level is the whole
// starting point — which is exactly what the onboarding question is for.
export function seedScore({ tier, calibrationSkills }) {
  const base = TIER_SEED_SCORE[tier] ?? 40;
  const cal = calibrationScore(calibrationSkills);
  if (cal == null) return base;
  return clamp0100(base * 0.5 + cal * 0.5);
}

// Fold one new graded activity (0-100) into the rolling score. `weight` scales
// how much it moves things — a game shifts the score half as far as a lesson.
export function updateScore(prev, score, weight = 1) {
  const p = typeof prev === 'number' && isFinite(prev) ? prev : 50;
  const alpha = PERF_ALPHA * Math.max(0, Math.min(1, weight));
  return clamp0100(p * (1 - alpha) + clamp0100(score) * alpha);
}

export function bandFor(score) {
  const s = clamp0100(score);
  if (s < REINFORCE_MAX) return 'reinforce';
  if (s >= STRETCH_MIN) return 'stretch';
  return 'steady';
}

// The highest tier this learner can be promoted to: Power User, or their own
// declared level if they declared higher. Someone who said Developer and was
// moved down to Builder can climb back to Developer; someone who said Beginner
// stops at Power User no matter how well they do.
export function promotionCeiling(declaredTier) {
  return rank(declaredTier) > rank(PROMOTION_CEILING) ? declaredTier : PROMOTION_CEILING;
}

// One step along the full ladder, respecting the promotion ceiling.
export function stepTier(currentTier, direction, declaredTier) {
  const i = rank(currentTier);
  if (direction === 'up') {
    const ceiling = rank(promotionCeiling(declaredTier));
    return FULL_LADDER[Math.min(i + 1, ceiling, FULL_LADDER.length - 1)];
  }
  return FULL_LADDER[Math.max(0, i - 1)];
}

// --- State -----------------------------------------------------------------
// Stored shape:
//   { score, samples, current_tier, band, band_streak, fail_streak, cooldown,
//     last_change, updated_at }

export function seedState({ tier, calibrationSkills }) {
  const score = seedScore({ tier, calibrationSkills });
  return {
    score,
    samples: 0,
    evidence: 0,
    current_tier: tier,
    band: bandFor(score),
    band_streak: 0,
    fail_streak: 0,
    cooldown: 0,
    fast_demoted_at: null,
    last_change: null,
    updated_at: new Date().toISOString(),
  };
}

// Read the earned tier out of a stored state, tolerating the OLD shape.
//
// Docs written before this rewrite have { score, samples, last_band } and no
// current_tier. Falling back to the old "declared, shifted by band" derivation
// means nobody's level jumps the moment this deploys — they carry on from where
// the previous logic had them.
export function tierFromState(state, declaredTier) {
  if (state?.current_tier && FULL_LADDER.includes(state.current_tier)) return state.current_tier;
  if (typeof state?.score !== 'number') return declaredTier;
  const band = state.last_band || bandFor(state.score);
  if (band === 'stretch') return stepTier(declaredTier, 'up', declaredTier);
  if (band === 'reinforce') return stepTier(declaredTier, 'down', declaredTier);
  return declaredTier;
}

// Fold one graded activity into the state and decide whether the level moves.
//
// Returns { state, change } — `change` is null unless the tier actually moved,
// in which case it's { from, to, direction, reason } for the notification and
// the activity log.
export function applyActivity(state, { score, weight = 1, declaredTier }) {
  const prev = state && typeof state.score === 'number'
    ? state
    : seedState({ tier: declaredTier });

  const nextScore = updateScore(prev.score, score, weight);
  const band = bandFor(nextScore);
  const bandStreak = band === prev.band ? (prev.band_streak || 0) + 1 : 1;

  // Only full-weight activities count toward the fast path. A bad game round is
  // not the same evidence as failing a lesson twice, and shouldn't demote anyone.
  const isFullWeight = weight >= 1;
  const failed = clamp0100(score) < FAIL_SCORE;
  const failStreak = isFullWeight && failed ? (prev.fail_streak || 0) + 1 : (failed ? (prev.fail_streak || 0) : 0);

  const currentTier = tierFromState(prev, declaredTier);
  const samples = (prev.samples || 0) + 1;
  // Legacy docs have no `evidence`; treat their sample count as lesson-weight so
  // an existing learner isn't sent back to square one on the deploy.
  const evidence = (prev.evidence ?? prev.samples ?? 0) + weight;
  const cooldown = Math.max(0, (prev.cooldown || 0) - 1);

  let nextTier = currentTier;
  let reason = null;

  // Fast path down: failed it, went back, failed it again. Skips the evidence
  // minimum on purpose — this is the case where waiting for more evidence means
  // more lessons pitched over someone's head.
  //
  // It does NOT skip the cooldown, and it fires at most ONCE per level. Both
  // limits exist because the pass bar is 70%, so a learner who consistently
  // scores in the fifties is "failing" every single time. Without them, a Builder
  // averaging 50% slid to Beginner in eight lessons — three rungs on a run that
  // never once put them in the struggling band. Getting half of it wrong is a
  // reason to drop a level; it is not a reason to keep dropping. After the quick
  // drop they have to actually be in the reinforce band to fall further, which is
  // the slow path's job.
  const fastAvailable = prev.fast_demoted_at !== currentTier;
  if (failStreak >= FAST_FAIL_STREAK && cooldown === 0 && fastAvailable) {
    const down = stepTier(currentTier, 'down', declaredTier);
    if (down !== currentTier) {
      nextTier = down;
      reason = 'repeated_fail';
    }
  } else if (evidence >= MIN_EVIDENCE && cooldown === 0 && bandStreak >= BAND_STREAK_REQUIRED) {
    // The slow path, both directions.
    if (band === 'stretch') {
      const up = stepTier(currentTier, 'up', declaredTier);
      if (up !== currentTier) { nextTier = up; reason = 'sustained_high'; }
    } else if (band === 'reinforce') {
      const down = stepTier(currentTier, 'down', declaredTier);
      if (down !== currentTier) { nextTier = down; reason = 'sustained_low'; }
    }
  }

  const moved = nextTier !== currentTier;
  const change = moved
    ? {
      from: currentTier,
      to: nextTier,
      direction: rank(nextTier) > rank(currentTier) ? 'up' : 'down',
      reason,
    }
    : null;

  return {
    state: {
      score: nextScore,
      samples,
      evidence: Math.round(evidence * 100) / 100,
      current_tier: nextTier,
      band,
      band_streak: bandStreak,
      // A move resets the fail streak: they've been dropped a rung, so the next
      // fail is evidence about the NEW level, not more of the same case.
      fail_streak: moved ? 0 : failStreak,
      cooldown: moved ? COOLDOWN_ACTIVITIES : cooldown,
      // Which level the quick drop has already been spent on. Cleared whenever
      // someone moves UP, so climbing back re-arms it for the level above.
      fast_demoted_at: change?.direction === 'up'
        ? null
        : (reason === 'repeated_fail' ? nextTier : (prev.fast_demoted_at ?? null)),
      last_change: change ? { ...change, at: new Date().toISOString() } : (prev.last_change || null),
      updated_at: new Date().toISOString(),
    },
    change,
  };
}

// A short, learner-facing message for a level change. Never mentions being
// "dropped" — the person reading it is already having a bad run.
export function levelChangeMessage(fromTier, toTier) {
  if (!fromTier || !toTier || fromTier === toTier) return null;
  return rank(toTier) > rank(fromTier)
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
