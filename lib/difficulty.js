// Shared difficulty ordering so every list that shows a difficulty/level badge
// reads the same way across the platform: easy → hard. Different screens use
// different vocabularies (easy/medium/advanced, Beginner/Intermediate/Advanced,
// Easy/Medium/Hard) so we normalize them all to a single rank.

const DIFFICULTY_RANK = {
  easy: 0, beginner: 0, basic: 0, foundational: 0,
  medium: 1, intermediate: 1, moderate: 1, practitioner: 1,
  advanced: 2, hard: 2, expert: 2,
};

// Rank for sorting. Unknown/blank values sit in the middle so they don't jump
// to the front or back unexpectedly.
export function difficultyRank(value) {
  if (!value) return 1;
  return DIFFICULTY_RANK[String(value).toLowerCase().trim()] ?? 1;
}

// Color key for difficulty pills. Unlike the 3-rank sort above, this keeps
// "hard" as its OWN color slot between medium and advanced, so the palette is
// ready for a future 4-tier split (easy / medium / hard / advanced). Today the
// generator only emits easy/medium/advanced, so "hard" simply won't appear yet.
const DIFFICULTY_COLOR_KEY = {
  easy: 'easy', beginner: 'easy', basic: 'easy', foundational: 'easy',
  medium: 'medium', intermediate: 'medium', moderate: 'medium', practitioner: 'medium',
  hard: 'hard',
  advanced: 'advanced', expert: 'advanced',
};

const DIFFICULTY_PILL_STYLES = {
  easy: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  hard: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  advanced: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};

// Base classes shared by every difficulty pill on the platform.
export const difficultyPillBase =
  'inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border';

// Tailwind classes for a difficulty pill. Falls back to the medium style for
// unknown/blank values so a stray label never renders unstyled.
export function difficultyPillClass(value) {
  const key = DIFFICULTY_COLOR_KEY[String(value || '').toLowerCase().trim()] || 'medium';
  return DIFFICULTY_PILL_STYLES[key];
}

// Human-friendly label ("easy" → "Easy"). Returns '' for blank so callers can
// skip rendering a pill entirely when there's no difficulty.
export function difficultyLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// Returns a NEW array sorted easy → hard, stable within a tier (items of the
// same difficulty keep their original relative order). `accessor` pulls the
// difficulty string off each item; defaults to `item.difficulty`.
export function sortByDifficulty(items, accessor = (x) => x.difficulty) {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => difficultyRank(accessor(a.item)) - difficultyRank(accessor(b.item)) || a.i - b.i)
    .map((x) => x.item);
}
