// Priority levels for feedback triage, ordered by urgency (most → least).
// AI assigns one of these at submission time based on real-world severity in
// the text — NOT from category (a Bug can be Low, an Idea can be Critical) —
// and admins can always override via the dropdown.
export const PRIORITY_LEVELS = ['Critical', 'High', 'Needs Info', 'Med', 'Low', 'Future'];

// One-sentence definition per level. Feeds both the AI classifier's prompt and
// the admin UI's legend, so the two can never drift out of sync.
export const PRIORITY_DEFINITIONS = {
  Critical: "The person is fully blocked with zero path forward — dead in the water (e.g. can't log in at all, a core page crashes/won't load, they're completely stuck). Extremely rare. If the person could still do ANYTHING else in the app, or the broken thing has any workaround, it is NOT Critical.",
  High: "A real, significant defect — a feature is broken, degraded, or loses the person's work/progress — but they can still use the rest of the app (e.g. a feature falls back to a broken-but-usable state instead of working correctly).",
  'Needs Info': 'Too vague or ambiguous to judge severity or reproduce; flag for follow-up instead of guessing.',
  Med: "A real, noticeable problem or worthwhile improvement that doesn't block or degrade core functionality.",
  Low: 'Cosmetic, a small UI glitch, minor confusion, or polish item with no functional impact — the underlying feature still works.',
  Future: 'An idea or nice-to-have with no urgency.',
};
