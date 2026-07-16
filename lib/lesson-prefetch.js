// Client-side prefetch for lesson plans. The plan call (a large, serial model
// request) is the single biggest slice of lesson-open latency. When the learner
// commits to a topic, we can start generating the plan immediately — during the
// "Generating…" beat and the reader's mount — so by the time the reader asks for
// it, it's already in flight or done. Quality is unchanged: it's the exact same
// request, just started a beat earlier.

const cache = new Map(); // key -> { promise, at }
const TTL_MS = 5 * 60 * 1000;

function keyFor(topic, format, tools) {
  const ids = (tools || []).map((t) => t.id).join(',');
  return `${format}::${(topic || '').trim().toLowerCase()}::${ids}`;
}

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.at > TTL_MS) cache.delete(k);
  }
}

// Start (or reuse) a plan request for this exact topic/format/tools. Idempotent:
// calling it repeatedly for the same key won't fire a second request.
export function prefetchPlan(topic, format, tools) {
  if (typeof window === 'undefined' || !topic) return;
  prune();
  const key = keyFor(topic, format, tools);
  if (cache.has(key)) return;
  const promise = fetch('/api/lesson/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, format, tools }),
  })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  cache.set(key, { promise, at: Date.now() });
}

// The prefetched plan for this key as a Promise (resolving to plan data or null),
// or null if nothing was prefetched. Kept in cache so a remount can still reuse it
// within the TTL.
export function takePrefetchedPlan(topic, format, tools) {
  const entry = cache.get(keyFor(topic, format, tools));
  return entry ? entry.promise : null;
}
