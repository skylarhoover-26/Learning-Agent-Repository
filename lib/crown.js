// Crown rank tiers, shared across every surface that shows a crown so #1/#2/#3
// look the same everywhere: 1 = gold (#1), 2 = silver (#2), 3 = bronze (#3),
// 0 = no crown. `championIds` from the leaderboard is ordered, so a learner's
// tier is just their position in that list + 1.

export function crownTierFromIds(learnerId, orderedIds) {
  if (!learnerId || !Array.isArray(orderedIds)) return 0;
  const i = orderedIds.indexOf(learnerId);
  return i >= 0 ? i + 1 : 0;
}

// Tailwind text color for the small lucide <Crown> badge icons, by tier.
export const CROWN_ICON_CLASS = {
  1: 'text-amber-500',
  2: 'text-slate-400',
  3: 'text-amber-700',
};

// Short label for a tier, e.g. for tooltips/copy.
export const CROWN_TIER_LABEL = { 1: 'Gold — #1', 2: 'Silver — #2', 3: 'Bronze — #3' };
