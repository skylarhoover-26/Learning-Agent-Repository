import { put, list } from '@vercel/blob';

// Storage layout: ONE immutable blob per entry, under a per-day "folder":
//   audit/<date>/<id>.json
// This is append-only, so concurrent events never clobber each other. The old
// layout kept a single audit/<date>.json aggregate and did read-modify-write on
// every event (read the whole file, push one entry, overwrite it) — under any
// concurrency (a lesson firing plan→continue→quiz→grade in seconds, or a burst
// of page visits) two writes would read the same file and the last one to write
// would silently erase the other's entry. That's why the log only ever showed a
// couple of entries. Per-entry blobs remove the shared file entirely.
//
// Legacy audit/<date>.json aggregates are still READ so historical days survive.

// Safety cap on how many entries we pull for a single day, so a runaway day
// can't fan out into unbounded blob fetches.
const MAX_ENTRIES_PER_DAY = 2000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Fetch a blob's JSON fresh (cache-busted) — entries are written once and never
// change, but the day list can grow between reads.
async function fetchJson(blob) {
  try {
    const base = blob.downloadUrl || blob.url;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Read every entry for a day: the new per-entry blobs plus any legacy aggregate.
async function getDayEntries(date) {
  const entries = [];

  // New per-entry blobs: audit/<date>/<id>.json
  try {
    const { blobs } = await list({ prefix: `audit/${date}/`, limit: MAX_ENTRIES_PER_DAY });
    const loaded = await Promise.all(blobs.map(fetchJson));
    for (const e of loaded) if (e) entries.push(e);
  } catch {
    // ignore — fall through to legacy
  }

  // Legacy single-file aggregate: audit/<date>.json (pre-migration history).
  try {
    const { blobs } = await list({ prefix: `audit/${date}.json`, limit: 1 });
    if (blobs.length) {
      const arr = await fetchJson(blobs[0]);
      if (Array.isArray(arr)) entries.push(...arr);
    }
  } catch {
    // ignore
  }

  return entries;
}

export async function logAuditEntry({
  type,
  endpoint,
  user,
  model,
  input,
  output,
  durationMs,
  error,
}) {
  try {
    const date = todayKey();
    const id = generateId();

    const entry = {
      id,
      timestamp: new Date().toISOString(),
      type,
      endpoint,
      user: user || { email: 'unknown', name: 'Unknown' },
      model: model || 'unknown',
      input,
      output: error ? null : output,
      durationMs: Math.round(durationMs || 0),
      error: error || null,
    };

    // Each entry is its own object keyed by a unique id — no shared file, so
    // concurrent writes can't overwrite one another.
    await put(`audit/${date}/${id}.json`, JSON.stringify(entry), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true, // ids are unique; guards against a rare id collision
      cacheControlMaxAge: 0,
    });

    return entry;
  } catch (err) {
    console.error('Audit log write failed:', err);
    return null;
  }
}

export async function getAuditEntries({ date, type, userEmail, limit } = {}) {
  try {
    const targetDate = date || todayKey();
    let filtered = await getDayEntries(targetDate);

    // `ai` = every real AI interaction (everything except navigation/page views).
    if (type === 'ai') {
      filtered = filtered.filter((e) => e.type !== 'page_visit');
    } else if (type && type !== 'all') {
      filtered = filtered.filter((e) => e.type === type);
    }

    if (userEmail) {
      const lower = userEmail.toLowerCase();
      filtered = filtered.filter(
        (e) => e.user?.email?.toLowerCase().includes(lower)
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  } catch {
    return [];
  }
}

export async function getAuditDates() {
  try {
    const byDate = new Map(); // date -> total size (bytes)

    // `folded` groups the per-entry blobs into their date "folders" cheaply
    // (audit/<date>/) and returns any files sitting directly under audit/ (the
    // legacy audit/<date>.json aggregates) as blobs.
    const { folders = [], blobs = [] } = await list({
      prefix: 'audit/',
      mode: 'folded',
      limit: 1000,
    });

    for (const folder of folders) {
      const m = folder.match(/audit\/(\d{4}-\d{2}-\d{2})\//);
      if (m && !byDate.has(m[1])) byDate.set(m[1], 0);
    }
    for (const b of blobs) {
      const m = b.pathname.match(/audit\/(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) byDate.set(m[1], (byDate.get(m[1]) || 0) + (b.size || 0));
    }

    return [...byDate.keys()]
      .map((date) => ({ date, size: byDate.get(date) || 0 }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function getAuditStats(date) {
  try {
    const entries = await getDayEntries(date || todayKey());
    const byType = {};
    const byUser = {};
    let totalDuration = 0;
    let errorCount = 0;

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      const email = entry.user?.email || 'unknown';
      byUser[email] = (byUser[email] || 0) + 1;
      totalDuration += entry.durationMs || 0;
      if (entry.error) errorCount++;
    }

    return {
      total: entries.length,
      byType,
      byUser,
      avgDurationMs: entries.length > 0 ? Math.round(totalDuration / entries.length) : 0,
      errorCount,
    };
  } catch {
    return { total: 0, byType: {}, byUser: {}, avgDurationMs: 0, errorCount: 0 };
  }
}
