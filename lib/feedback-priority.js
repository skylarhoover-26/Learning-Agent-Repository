// Priority levels for feedback triage, ordered by urgency (most → least).
// AI assigns one of these at submission time based on real-world severity in
// the text — NOT from category (a Bug can be Low, an Idea can be Critical) —
// and admins can always override via the dropdown.
export const PRIORITY_LEVELS = ['Critical', 'High', 'Needs Info', 'Med', 'Low', 'Future'];

// One-sentence definition per level. Feeds both the AI classifier's prompt and
// the admin UI's legend, so the two can never drift out of sync.
export const PRIORITY_DEFINITIONS = {
  Critical: "The app is completely unusable for this person — dead in the water (e.g. can't log in, a core page crashes). Reserve for true showstoppers.",
  High: 'A real, significant problem — a feature is broken or badly degraded — but the person can still get some use out of the app.',
  'Needs Info': 'Too vague or ambiguous to judge severity or reproduce; flag for follow-up instead of guessing.',
  Med: "A genuine issue or worthwhile improvement that doesn't block anyone.",
  Low: 'Cosmetic, a minor annoyance, or small polish with no functional impact.',
  Future: 'An idea or nice-to-have with no urgency.',
};
