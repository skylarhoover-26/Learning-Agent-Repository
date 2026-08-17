// Which capybara easter eggs this device has actually seen.
//
// Recording starts now, with the placements, so that the collection mechanic
// (find them all → unlock the Capybara sidekick) can be built on top without
// going back to edit all eleven placement sites a second time.
//
// Device-local on purpose for this first pass: nothing is awarded off this data
// yet, so a shared browser can't mis-grant anything. When the badge and the
// sidekick unlock land, this gets scoped per user and dual-written to Supabase
// like the rest of the learner record — see lib/easter-eggs.js for the roster
// the count is measured against.

const KEY = 'la_capy_found_v1';

function canStore() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function readFinds() {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch (error) {
    // A corrupt or blocked store must never break the surface the capybara is
    // decorating — the egg is a flourish, the page around it is the product.
    console.error('Could not read capybara finds:', error);
    return [];
  }
}

export function recordFind(id) {
  if (!id || !canStore()) return readFinds();
  try {
    const current = readFinds();
    if (current.includes(id)) return current;
    const next = [...current, id];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch (error) {
    console.error('Could not record capybara find:', error);
    return readFinds();
  }
}

export function hasFound(id) {
  return readFinds().includes(id);
}
