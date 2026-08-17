// Reading the capybara collection.
//
// A collected capybara is an XP event in the learner's ledger (source
// 'capy_find', egg id in meta) — see planCapyFind in lib/progression-core.js.
// This file is just the read side, so UI never has to know that.
//
// It used to be localStorage. That changed when collecting became a deliberate
// click worth XP: the count now has to be durable, cross-device, and visible to
// the leaderboard and the admin tools, and the ledger is all three already.
// Nothing here writes — writes go through onCapyFind so the XP and the record
// can never disagree.

import { getXpEvents } from './learner-store';
import { capyFindIds } from './progression-core';
import { collectionProgress } from './easter-eggs';

// The eggs this learner has collected.
export function readFinds(learnerId) {
  if (!learnerId) return [];
  try {
    return [...capyFindIds(getXpEvents(learnerId))];
  } catch (error) {
    // A collection read must never break the page a capybara sits on.
    console.error('Could not read capybara finds:', error);
    return [];
  }
}

export function hasFound(eggId, learnerId) {
  if (!eggId || !learnerId) return false;
  return readFinds(learnerId).includes(eggId);
}

// Progress against the live roster, for the counters on Achievements, the tour
// pop-up, and the admin key.
export function findProgress(learnerId) {
  return collectionProgress(readFinds(learnerId));
}
