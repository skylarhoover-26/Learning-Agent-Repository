// Shared helpers for the AI-news surfaces (the home card and /ai-news), so the
// two can't disagree about freshness wording or what counts as research.

// The daily scan's cron, from vercel.json: "0 8 * * *" = 08:00 UTC = 1:00 AM PT.
// Displayed to learners so "updated N hours ago" has something to sit against.
// KEEP IN SYNC with vercel.json if the schedule changes.
export const SCAN_TIME_LABEL = '1:00 AM PT';

// Which categories (from lib/news-relevance.js) actually reach learners. The
// scan stores a category on every finding and throws nothing away, so this list
// is the single lever for tuning what shows — no re-scan needed.
//
export const APPROVED_CATEGORIES = [
  'model_change',
  'tool_feature',
  'prompt_practice',
  'safety_practice',
];

// Categories DISCARDED at scan time — not merely hidden. Everything else is kept
// and reachable behind the browse page's "Show everything" toggle, but these are
// removed before they're ever written, so no learner can surface them.
//
// security_incident is here because attack/breach/vulnerability headlines push
// people toward fear rather than competence, and "hidden by default" wasn't
// enough: /ai-news is a normal learner page, so anyone could have toggled them
// into view. Constructive caution still reaches learners via safety_practice.
export const EXCLUDED_CATEGORIES = ['security_incident'];

export function isExcluded(item) {
  return EXCLUDED_CATEGORIES.includes(item?.category);
}

// Strip discarded categories. Applied both when the scan writes and when the API
// reads, so anything stored before a category joined this list still never ships.
export function dropExcluded(items) {
  return (items || []).filter((i) => !isExcluded(i));
}

// Display order + headings for the browse page.
export const CATEGORY_LABELS = {
  model_change: 'Model changes',
  tool_feature: 'New tool features',
  prompt_practice: 'Prompting & practice',
  safety_practice: 'Using AI well',
  vendor_pitch: 'Product pitches',
  dev_tooling: 'Developer tooling',
  security_incident: 'Security incidents',
  business: 'Business & market',
  policy_legal: 'Policy & legal',
  research: 'Research',
  infrastructure: 'Infrastructure',
  hardware_gadget: 'Devices & robotics',
  industry_news: 'Industry news',
  other: 'Other',
  unclassified: 'Not yet categorised',
};

export function isApproved(item) {
  return APPROVED_CATEGORIES.includes(item?.category);
}

// Findings stored before categorisation existed have no `category`. They are
// intentionally NOT approved — an untagged item has not passed the guardrail, and
// defaulting to "show" would quietly reopen the hole this was built to close. The
// daily scan back-fills them (see classifyUntagged in api/curriculum/daily).
export function splitByApproval(items) {
  const list = items || [];
  return {
    approved: list.filter(isApproved),
    rejected: list.filter((i) => !isApproved(i)),
  };
}

// Group findings under their category heading, in APPROVED_CATEGORIES order
// first, then everything else by size.
export function groupByCategory(items) {
  const byCat = new Map();
  for (const item of items || []) {
    const key = item?.category || 'unclassified';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key).push(item);
  }
  const groups = [...byCat.entries()].map(([category, list]) => ({
    category,
    label: CATEGORY_LABELS[category] || category,
    items: list,
  }));
  const rank = (c) => {
    const i = APPROVED_CATEGORIES.indexOf(c);
    return i === -1 ? APPROVED_CATEGORIES.length : i;
  };
  return groups.sort((a, b) => rank(a.category) - rank(b.category) || b.items.length - a.items.length);
}

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
