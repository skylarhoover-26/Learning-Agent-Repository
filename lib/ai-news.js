// Shared helpers for the AI-news surfaces (the home card and /ai-news), so the
// two can't disagree about freshness wording or what counts as research.

// The daily scan's cron, from vercel.json: "0 8 * * *" = 08:00 UTC = 1:00 AM PT.
// Displayed to learners so "updated N hours ago" has something to sit against.
// KEEP IN SYNC with vercel.json if the schedule changes.
export const SCAN_TIME_LABEL = '1:00 AM PT';

// arXiv entries are raw paper titles. They still earn their place in the scan —
// they feed the AI-generated daily lessons — but a learner browsing the list
// shouldn't hit "Do Models Fake Alignment Without Clear Consequences" presented
// as a practical pick, so the browse page files them under Research.
export function isResearchSource(sourceName) {
  return /^arxiv/i.test(String(sourceName || ''));
}

// "just now" / "3h ago" / "yesterday" / "6d ago". Mirrors relativeAccessTime in
// lib/paused-lessons.js; kept separate so the news surfaces don't depend on the
// paused-lessons module.
export function freshnessLabel(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

// Group findings by source, newest-first within each group, with the research
// sources separated out. Returns { practical, research } where each is an array
// of { sourceName, items }.
export function groupBySource(items) {
  const bySource = new Map();
  for (const item of items || []) {
    const key = item?.sourceName || 'Other';
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(item);
  }
  const groups = [...bySource.entries()].map(([sourceName, list]) => ({ sourceName, items: list }));
  // Biggest groups first so the page opens on substance rather than a one-item
  // source; research always sits at the bottom regardless of size.
  const bySize = (a, b) => b.items.length - a.items.length;
  return {
    practical: groups.filter((g) => !isResearchSource(g.sourceName)).sort(bySize),
    research: groups.filter((g) => isResearchSource(g.sourceName)).sort(bySize),
  };
}

// The lesson link for a finding — the article title becomes the lesson topic.
export function lessonHref(item) {
  return `/lesson?prefill=${encodeURIComponent(item?.title || '')}`;
}
