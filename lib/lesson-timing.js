// How long a lesson plan is allowed to take, on both sides of the wire.
//
// WHY ONE FILE. These numbers used to live in two places that never agreed: a
// client abort budget in components/plan-lesson-player.jsx and a retry COUNT in
// lib/ai.js. Counting attempts instead of timing them is the bug — three server
// attempts at ~60s each is ~180s, which is comfortably past the 150s the client
// was willing to wait, so the browser gave up on runs the server was still
// working on and the learner got "this lesson is taking longer than usual" while
// the function ran happily on for another minute (feedback #232, and #135 and
// #181 before it — same shape each time).
//
// The rule the three constants encode:
//
//   route maxDuration  >  client abort  >  server deadline
//        300s               150/280s        130/250s
//
// The server must always give up FIRST and answer, so the learner gets a real
// error instead of a hung request; the client must always give up before the
// platform kills the function, so a killed function can't look like a hang.
// Change one of these and change the others to match.
//
// PURE MODULE — imported by a client component and by server code.

// What the browser waits for /api/lesson/plan before aborting.
export const PLAN_CLIENT_TIMEOUT_MS = {
  light: 150_000,
  heavy: 280_000,
};

// What the server gives itself to produce a plan, retries included. 20s under
// the client budget: enough for the JSON response to travel and for the audit
// entry to be written before anyone gives up.
export const PLAN_SERVER_BUDGET_MS = {
  light: 130_000,
  heavy: 250_000,
};

// Floor for "is there time for another attempt?". A plan attempt has never been
// observed under ~45s in production (the fast ones run 51-76s), so with less than
// this left there is no point starting one — it would be killed mid-flight and
// cost the learner the wait for nothing.
export const PLAN_MIN_ATTEMPT_MS = 45_000;

// project_quest and deep_dive generate far more JSON per plan and get the longer
// budgets. One predicate so the client and the server can't classify differently.
export function isHeavyFormat(format) {
  return format === 'project_quest' || format === 'deep_dive';
}

export function planClientTimeoutMs(format) {
  return isHeavyFormat(format) ? PLAN_CLIENT_TIMEOUT_MS.heavy : PLAN_CLIENT_TIMEOUT_MS.light;
}

export function planServerBudgetMs(format) {
  return isHeavyFormat(format) ? PLAN_SERVER_BUDGET_MS.heavy : PLAN_SERVER_BUDGET_MS.light;
}
