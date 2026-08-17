// How AI news gets ranked against ONE learner.
//
// lib/news-relevance.js answers "what KIND of news is this" — a question about
// the item, identical for everybody. This module answers the other half, which
// feedback #145 asked for: "what does this change for ME, given my role, tasks,
// goals and projects". A new model that changes how you should prompt is only
// news if you were going to prompt something today.
//
// The scoring itself is done by the model (api/ai-news/why), once per learner
// per day. What lives here is everything that has to be true on BOTH sides of
// the wire: the lane thresholds, the ranking order, and the counts behind the
// pills. Putting them in one pure module is why the page's pill counts can never
// disagree with the list the pill opens.
//
// Pure and dependency-light on purpose — imported by the /ai-news client page,
// so it must never pull in the Anthropic SDK or anything node-only.

import { isResearchSource } from './ai-news';

// How many of the newest items get judged per learner per day.
//
// This was 40, chosen to keep the call small. On a normal day the feed carries
// around 104 practical items, so it left ~60 of them under a "Not ranked"
// heading — a bucket nobody had judged, sitting on the page as though it were a
// category. The whole practical feed is now scored; the scoring batches run
// concurrently in the route, so covering three times as many items costs a
// couple of seconds rather than triple the wait.
//
// The findings blob is capped at 200 (api/curriculum/daily) and includes arXiv,
// which the page files separately, so this ceiling has real headroom above what
// a day actually produces. Anything past it still degrades honestly into the
// "Not ranked" section rather than vanishing.
//
// KEEP IN SYNC with SCORE_LIMIT in app/api/ai-news/why/route.js.
export const RANKED_LIMIT = 120;

// Of the ranked items, how many get the full "why this matters to you" sentence.
// The chip and score are cheap; the sentence is not, so only the items a learner
// will actually read get one.
export const WHY_LIMIT = 12;

// The lanes, in display order. `min` is the inclusive floor on the 0-100 score.
//
// The thresholds are deliberately generous at the bottom and strict at the top:
// the promise of the first lane is "this changes what you do", and a lane that
// cries wolf costs more trust than a quiet one. Anything the model was unsure
// enough about to score below 40 belongs in Background, where it is still one
// click away.
export const LANES = [
  {
    id: 'act',
    min: 70,
    label: 'Changes your work',
    note: 'These touch what you do day to day, the projects you have in flight, or a tool you already use. Worth ten minutes today.',
  },
  {
    id: 'watch',
    min: 40,
    label: 'Worth watching',
    note: 'Not urgent for your work, but close enough to it that you would rather hear it from us than be surprised by it later.',
  },
  {
    id: 'context',
    min: 0,
    label: 'Background',
    note: 'Further from your day to day. Here so the feed is complete, not because it needs your attention.',
  },
];

export const LANE_BY_ID = new Map(LANES.map((l) => [l.id, l]));

/**
 * Which lane a score falls in. Unscored items (the model failed, or they sat
 * past RANKED_LIMIT) return null rather than a lane — they are genuinely
 * unjudged, and filing them under Background would claim a judgement we never
 * made.
 *
 * @param {number|null|undefined} score
 * @returns {string|null} lane id
 */
export function laneFor(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  const lane = LANES.find((l) => score >= l.min);
  return lane ? lane.id : 'context';
}

/**
 * Merge the per-learner judgements onto the raw findings.
 *
 * `personal` is the map api/ai-news/why returns, keyed by externalId:
 *   { [id]: { why?: string, score?: number, match?: string } }
 *
 * Returns a NEW array; the input is never mutated. Every item comes back with
 * `score`, `lane`, `why` and `match` set (null where unknown) so no consumer has
 * to guess whether a missing field means "unscored" or "scored zero".
 */
export function attachPersonal(items, personal) {
  const map = personal || {};
  return (items || []).map((item) => {
    const p = map[item?.externalId] || {};
    const score = typeof p.score === 'number' ? clampScore(p.score) : null;
    return {
      ...item,
      score,
      lane: laneFor(score),
      why: p.why || null,
      match: p.match || null,
    };
  });
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Best-match order: highest score first, newest first within a tie, and every
 * unscored item after every scored one.
 *
 * Unscored last regardless of date is the important half. Sorting them by
 * recency alone would let this morning's unjudged item outrank a 95 from
 * yesterday that names the learner's own project.
 */
export function byBestMatch(a, b) {
  const sa = typeof a?.score === 'number' ? a.score : -1;
  const sb = typeof b?.score === 'number' ? b.score : -1;
  if (sa !== sb) return sb - sa;
  return publishedMs(b) - publishedMs(a);
}

// publishedAt is whatever the feed gave us (RFC-822 or ISO). Anything
// unparseable sorts oldest rather than poisoning the order with NaN.
export function publishedMs(item) {
  const ms = new Date(item?.publishedAt || 0).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Count per lane, for the pill row. Counts what the pill would actually open —
 * so it takes the SAME list the page has already filtered by source and
 * category, not the raw feed.
 *
 * Research items are excluded because the page gives them their own section
 * outside the lanes; counting them here would make the pills add up to more
 * than the lanes show.
 *
 * @returns {{ counts: Object, unranked: number, total: number }}
 */
export function laneCounts(items) {
  const counts = Object.fromEntries(LANES.map((l) => [l.id, 0]));
  let unranked = 0;
  let total = 0;
  for (const item of items || []) {
    if (isResearchSource(item?.sourceName)) continue;
    total++;
    if (item.lane) counts[item.lane]++;
    else unranked++;
  }
  return { counts, unranked, total };
}

/**
 * Has this learner been judged at all? Used to decide whether to show the lane
 * pills or fall back to the plain newest-first view.
 *
 * A single scored item is enough: a feed where only two items were relevant is a
 * real answer, not a failure.
 */
export function hasPersonalization(items) {
  return (items || []).some((i) => typeof i?.score === 'number');
}

/**
 * Match the heatmap's "worth a refresh" marks to the news items that caused
 * them, so an item can show which square it moves.
 *
 * Marks (lib/skill-staleness.js) carry the headline and url of the finding that
 * produced them. URL is the reliable key: headlines get re-titled by publishers
 * between the scan and now, and two feeds often carry the same story under
 * different words.
 *
 * @returns {Map<string, object>} externalId -> mark
 */
export function marksByItem(items, marks) {
  const out = new Map();
  if (!marks?.length) return out;
  const byUrl = new Map();
  for (const mark of marks) {
    if (mark?.url) byUrl.set(mark.url, mark);
  }
  for (const item of items || []) {
    if (!item?.externalId) continue;
    const mark = item.url ? byUrl.get(item.url) : null;
    if (mark) out.set(item.externalId, mark);
  }
  return out;
}
