// Category → default priority. Used when a submission has no explicit priority,
// so bugs surface at the top and ideas settle to the bottom. Praise is omitted
// (positive signal, not a triage item). Admins can override any of these.
export const CATEGORY_PRIORITY = {
  Bug: 'Critical',
  Confusing: 'High',
  Idea: 'Low',
  Other: 'Med',
};

// The default priority for a category, or null if it has none (e.g. Praise, or
// an uncategorized submission).
export function autoPriority(category) {
  return CATEGORY_PRIORITY[category] || null;
}
