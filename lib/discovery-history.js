// Saved Discovery searches.
//
// Discovery results used to live only in component state, so navigating away and
// back threw them out and you had to re-describe your role from scratch
// (feedback #3). This persists the last few searches — the work description AND
// the opportunities it produced — through /api/user-data, which dual-writes to
// Supabase, so your history follows you across devices.
//
// Best-effort by design: history is a convenience, so every call swallows its
// errors and degrades to "no history" rather than breaking the page.

const STORE_KEY = 'discovery_history';

// Ten is enough to find the search you meant without turning the start screen
// into a wall of text; each entry carries its full result set, so the cap also
// keeps the stored record small.
export const MAX_HISTORY = 10;

export async function loadDiscoveryHistory() {
  try {
    const res = await fetch(`/api/user-data?type=${STORE_KEY}`);
    if (!res.ok) return [];
    const stored = await res.json();
    // The store hands back either the raw value or a { data } envelope depending
    // on which backend answered, so unwrap both shapes.
    const list = Array.isArray(stored) ? stored : stored?.data;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function persist(entries) {
  try {
    await fetch('/api/user-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: STORE_KEY, data: entries }),
    });
  } catch {
    /* history is a convenience — a failed write shouldn't surface an error */
  }
}

// Add a search to the front of the history and persist the trimmed list.
// Re-running the same description moves the existing entry up and refreshes its
// results instead of stacking a duplicate. Returns the new list so the caller can
// set state from it without a re-read.
export async function addDiscoverySearch(history, { workDescription, opportunities }) {
  const text = (workDescription || '').trim();
  if (!text) return history || [];

  const entry = {
    id: `${Date.now()}`,
    workDescription: text,
    opportunities: opportunities || [],
    searchedAt: new Date().toISOString(),
  };
  const withoutDuplicate = (history || []).filter(
    (h) => (h.workDescription || '').trim().toLowerCase() !== text.toLowerCase()
  );
  const next = [entry, ...withoutDuplicate].slice(0, MAX_HISTORY);
  await persist(next);
  return next;
}

export async function removeDiscoverySearch(history, id) {
  const next = (history || []).filter((h) => h.id !== id);
  await persist(next);
  return next;
}

// "2 hours ago" / "Yesterday" — enough to tell two similar searches apart.
export function describeSearchAge(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}
