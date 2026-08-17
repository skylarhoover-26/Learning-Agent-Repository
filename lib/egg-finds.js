// Which capybara easter eggs this learner has seen — the progress half of the
// collection mechanic (find them all → unlock the Capybara sidekick).
//
// Storage is localStorage keyed by learner id, so a shared browser can't hand
// one person's progress to another.
//
// Why device-local progress is enough: the REWARD is durable, not the progress.
// Completing the set awards a `capybara_collection` XP event through the normal
// ledger, which syncs and is idempotent, so the badge and the unlocked sidekick
// survive any device change. Only partial progress is device-bound — switch
// browsers mid-hunt and you re-find a few. That's a fair trade for not adding
// another synced per-user store, and it can't be farmed: the ledger guard means
// the award fires at most once per learner, ever.
//
// The roster this is measured against is FINDABLE_EGG_IDS in lib/easter-eggs.js,
// derived from which eggs are actually live.

const KEY_PREFIX = 'la_capy_found_v1';

function canStore() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

// Finds recorded before a learner id resolves go in their own bucket rather than
// being dropped, and get merged in by absorbAnonFinds once identity settles.
function keyFor(learnerId) {
  return learnerId ? `${KEY_PREFIX}:${learnerId}` : `${KEY_PREFIX}:anon`;
}

export function readFinds(learnerId) {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(learnerId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch (error) {
    // A corrupt or blocked store must never break the surface the capybara is
    // decorating — the egg is a flourish, the page around it is the product.
    console.error('Could not read capybara finds:', error);
    return [];
  }
}

// Records a find and reports whether it was new, so callers can skip the
// completion check on the common path of re-seeing an egg already found.
export function recordFind(id, learnerId) {
  const current = readFinds(learnerId);
  if (!id || !canStore() || current.includes(id)) {
    return { finds: current, added: false };
  }
  try {
    const next = [...current, id];
    window.localStorage.setItem(keyFor(learnerId), JSON.stringify(next));
    return { finds: next, added: true };
  } catch (error) {
    console.error('Could not record capybara find:', error);
    return { finds: current, added: false };
  }
}

export function hasFound(id, learnerId) {
  return readFinds(learnerId).includes(id);
}

// Merge the pre-identity bucket into the learner's own, so eggs seen before the
// id resolved aren't stranded.
export function absorbAnonFinds(learnerId) {
  if (!learnerId || !canStore()) return readFinds(learnerId);
  const anon = readFinds(null);
  if (!anon.length) return readFinds(learnerId);
  try {
    const merged = [...new Set([...readFinds(learnerId), ...anon])];
    window.localStorage.setItem(keyFor(learnerId), JSON.stringify(merged));
    window.localStorage.removeItem(keyFor(null));
    return merged;
  } catch (error) {
    console.error('Could not merge capybara finds:', error);
    return readFinds(learnerId);
  }
}
