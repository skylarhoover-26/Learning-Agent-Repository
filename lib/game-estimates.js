// How long a game's round takes to generate, per game.
//
// Games showed a spinner and a label while generating ("Building your rounds…") with
// no time at all, while lessons name a band ("this usually takes 1.5-2 minutes").
// Same wait, same LLM, but only one of them told you what to expect — and an
// unbounded spinner is how a 30-second wait starts feeling broken.
//
// GameGenLoading already accepted an `estimateSeconds` prop and nobody ever passed
// one, so every game silently used its 18s default: the same promise for Wheel of
// Fortune (1500 output tokens) as for Hallucination Hunt (4000).
//
// These are ESTIMATES, scaled from each generator's max_tokens in
// app/api/games/generate/route.js, because output length is what dominates the wait.
// They are not measurements. /api/games/generate now records durationMs per type in
// the audit log, so /admin/activity-log can replace these with real numbers once a
// few rounds of each have been played.
const SECONDS_BY_SLUG = {
  'wheel-of-fortune': 20,   // 1500 tokens
  'lily-leap': 22,          // 2000
  'prompt-battle': 25,      // 2500
  'speed-round': 28,        // 3000
  'two-truths': 28,         // 3000
  'build-the-flow': 24,     // 2200
  'redact-it': 27,          // 2800
  'family-feud': 32,        // 3500
  millionaire: 32,          // 3500
  'hallucination-hunt': 35, // 4000
  jeopardy: 35,             // 4000, via its own generate-jeopardy route
};

// AI or Human generates nothing — its rounds are hand-written — so it has no wait
// and must not claim one.
export function gameGenSeconds(slug) {
  return SECONDS_BY_SLUG[slug] || null;
}

// "about 20-30 seconds", or null when there's nothing to wait for. Same 0.75x/1.4x
// spread GameGenLoading uses, so the start screen and the loader can't disagree.
export function gameGenEstimateLabel(slug) {
  const seconds = gameGenSeconds(slug);
  if (!seconds) return null;
  const low = Math.max(5, Math.round(seconds * 0.75));
  const high = Math.round(seconds * 1.4);
  return `about ${low}-${high} seconds`;
}
