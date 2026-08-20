// What each lesson format is called, and how long it takes the LEARNER.
//
// PURE MODULE — no storage, no fetch — so the Slack message builder, the chat
// offer wizard and anything else can all read the same numbers.
//
// These are time-to-COMPLETE estimates, which is a different question from the
// generation waits in lib/game-estimates.js and the `estimate` values in
// components/plan-lesson-player.jsx (both of those are "how long until the
// content appears"). Don't cross the two.
//
// The durations match what the generator is told to produce in PLAN_SHAPE
// (lib/ai.js) — a Quick Lesson is capped at 4 slides precisely so 3-5 minutes
// stays true. If a format's shape changes there, change it here too.
//
// Written with plain hyphens, not en dashes, because the daily Slack message
// bans dashes in its copy and this string goes straight into it.

export const FORMAT_LABEL = {
  quick_tip: 'Quick Tip',
  standard: 'Quick Lesson',
  deep_dive: 'Deep Dive',
  project_quest: 'Project Quest',
};

export const FORMAT_DURATION = {
  quick_tip: '60 seconds',
  standard: '3-5 min',
  deep_dive: '15-20 min',
  project_quest: '20-60 min',
};

// 'standard' is the default everywhere a format is optional (lib/ai.js resolves
// an unknown format to it, and Today's Pick generates at PICK_FORMAT =
// 'standard'), so an absent format resolves the same way here.
function resolve(format) {
  return FORMAT_LABEL[format] ? format : 'standard';
}

export function formatLabel(format) {
  return FORMAT_LABEL[resolve(format)];
}

// "3-5 min". Never null — every format has a shape and therefore a duration.
export function formatDuration(format) {
  return FORMAT_DURATION[resolve(format)];
}

// "Quick Lesson, about 3-5 min" — for anywhere that wants both in one string.
export function formatLabelWithDuration(format) {
  const key = resolve(format);
  return `${FORMAT_LABEL[key]}, about ${FORMAT_DURATION[key]}`;
}
