// Merge semantics for the three append-only learner ledgers (XP events, badges
// earned, lesson history).
//
// These are written from the browser as a WHOLE array: `saveToBlob` posts the
// complete localStorage copy on every change, so /api/user-data was a
// last-writer-wins overwrite. That's fine while the browser is the only writer
// and silently destructive the moment anything else appends — a lesson finished
// in Slack lands in the ledger server-side, then the learner's next browser sync
// posts its own (shorter) array and the record is gone.
//
// XP only survived that by accident: the Supabase mirror upserts events and
// never deletes rows, so the leaderboard kept totals the blob had already lost.
// Badges and lesson history had no such protection at all.
//
// So POSTs of these types merge by identity instead of replacing. Genuinely
// shrinking writes still exist — the admin XP reset and reverting a role
// snapshot both legitimately shorten a ledger — and those pass `mode: 'replace'`
// explicitly. See app/api/user-data/route.js and lib/sync-store.js.

const LEDGER_PATTERN = /^lp_(xp|badges|lessons)_/;

export function isAppendOnlyLedger(dataType) {
  return LEDGER_PATTERN.test(String(dataType || ''));
}

// Stable identity for one ledger entry. Badges are keyed by badge_id (one row
// per badge, ever); XP events and lesson records carry a generated `id`.
//
// The fallback matters more than it looks. The same array is re-posted on every
// debounced sync, so an entry we can't identify would be treated as new and
// appended again on every single save, growing without bound. Hashing the entry's
// own contents means a legacy row from before ids dedupes against itself.
function entryKey(entry, dataType) {
  if (!entry || typeof entry !== 'object') return `raw:${JSON.stringify(entry ?? null)}`;
  if (/^lp_badges_/.test(String(dataType)) && entry.badge_id) return `badge:${entry.badge_id}`;
  if (entry.id) return `id:${entry.id}`;
  return `hash:${JSON.stringify(entry)}`;
}

// Union of what's already stored and what was just posted, stored entries first.
// Order within each side is preserved, and consumers sort by timestamp anyway.
//
// Entries are immutable once written, so a collision keeps the STORED copy: a
// client re-posting an older view of an event it already synced can't rewrite
// history. Returns `incoming` untouched when it isn't an array, so a malformed
// payload behaves exactly as it did before this merge existed.
export function mergeLedger(stored, incoming, dataType) {
  if (!Array.isArray(incoming)) return incoming;
  const base = Array.isArray(stored) ? stored : [];
  if (!base.length) return incoming;

  const seen = new Set(base.map((entry) => entryKey(entry, dataType)));
  const merged = [...base];
  for (const entry of incoming) {
    const key = entryKey(entry, dataType);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}
