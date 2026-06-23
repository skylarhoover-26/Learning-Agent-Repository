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

// Returns a NEW array sorted easy → hard, stable within a tier (items of the
// same difficulty keep their original relative order). `accessor` pulls the
// difficulty string off each item; defaults to `item.difficulty`.
export function sortByDifficulty(items, accessor = (x) => x.difficulty) {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => difficultyRank(accessor(a.item)) - difficultyRank(accessor(b.item)) || a.i - b.i)
    .map((x) => x.item);
}
