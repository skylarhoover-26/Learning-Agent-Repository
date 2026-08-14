// The start-of-quarter profile check-in.
//
// A learner's tasks, goals, tools and projects are what every lesson, game and
// Today's Pick is built from — and all four go stale silently. Someone who changed
// teams in May keeps getting May's examples until they happen to open their profile.
// A quarter boundary is a natural, low-frequency moment to ask.
//
// Pure module: no React, no storage, no fetch. Everything here is a function of
// (profile, now) so both the modal and any future server-side reminder agree.

// The four boundaries, in one place. Calendar quarters (Jan/Apr/Jul/Oct 1). If
// Housecall Pro's FISCAL quarters differ, this array is the only thing to change —
// the months must stay sorted and there must be four of them.
const QUARTER_START_MONTHS = [1, 4, 7, 10];

// Quarters are resolved in Pacific time, matching lib/content-day.js, so the check
// appears on the same calendar day for everyone rather than a day early for anyone
// east of PT.
function pacificParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return { year: +parts.year, month: +parts.month, day: +parts.day };
}

// 1-4 for a given month number.
function quarterOfMonth(month) {
  let q = 1;
  QUARTER_START_MONTHS.forEach((startMonth, i) => {
    if (month >= startMonth) q = i + 1;
  });
  return q;
}

// "2026-Q3" — the value stored on the profile as `profile_checked`, so a check-in
// answered on one device is answered everywhere.
export function currentQuarterKey(now = new Date()) {
  const { year, month } = pacificParts(now);
  return `${year}-Q${quarterOfMonth(month)}`;
}

// "Q4" — for "Q4 just started".
export function currentQuarterLabel(now = new Date()) {
  return `Q${quarterOfMonth(pacificParts(now).month)}`;
}

// "Q1" — what the footer promises next, wrapping to Q1 after Q4.
export function nextQuarterLabel(now = new Date()) {
  const q = quarterOfMonth(pacificParts(now).month);
  return `Q${q === 4 ? 1 : q + 1}`;
}

// Which quarter a stored timestamp fell in, or null if unparseable.
export function quarterKeyOf(dateish) {
  if (!dateish) return null;
  const d = new Date(dateish);
  if (Number.isNaN(d.getTime())) return null;
  return currentQuarterKey(d);
}

/**
 * Should this learner see the check-in right now?
 *
 * Deliberately conservative — a prompt that fires when it isn't wanted trains
 * people to dismiss it without reading, which costs more than the reminder is
 * worth.
 *
 * @param {object}  input
 * @param {object}  input.profile             the learner
 * @param {boolean} input.calibrationPending  is the calibration gate still ahead?
 * @param {Date}    [input.now]
 * @returns {boolean}
 */
export function shouldPromptQuarterCheck({ profile, calibrationPending, now = new Date() }) {
  if (!profile || !profile.department) return false;      // not onboarded yet
  if (calibrationPending) return false;                   // never stack two gates
  const key = currentQuarterKey(now);
  if (profile.profile_checked === key) return false;      // already answered this quarter
  // Onboarded (or already re-confirmed) DURING this quarter — they've just told us
  // all four answers, so asking again is noise.
  if (quarterKeyOf(profile.onboarded_at) === key) return false;
  return true;
}
