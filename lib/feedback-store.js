import { put, list, del } from '@vercel/blob';

// Each feedback submission is stored as its OWN blob under `feedback/` so
// concurrent submissions never race a shared list. Screenshots live under a
// separate `feedback-screenshots/` prefix (which does NOT match the `feedback/`
// list prefix, so record listing never picks up image blobs).
const RECORD_PREFIX = 'feedback/';
const SHOT_PREFIX = 'feedback-screenshots/';
const MAX_SHOT_BYTES = 5 * 1024 * 1024; // 5MB per image

// "data:image/png;base64,AAAA" -> { buffer, contentType, ext } (or null).
function parseImageDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  const contentType = match[1];
  if (!contentType.startsWith('image/')) return null;
  const ext = (contentType.split('/')[1] || 'png').split('+')[0];
  return { buffer: Buffer.from(match[2], 'base64'), contentType, ext };
}

// Upload one screenshot; returns its public URL, or null if it can't be stored.
export async function uploadFeedbackScreenshot(dataUrl) {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return null;
  if (parsed.buffer.length > MAX_SHOT_BYTES) return null;
  try {
    const blob = await put(`${SHOT_PREFIX}shot.${parsed.ext}`, parsed.buffer, {
      access: 'public',
      contentType: parsed.contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (error) {
    console.error('Feedback screenshot upload failed:', error);
    return null;
  }
}

export async function saveFeedback(record) {
  const key = `${RECORD_PREFIX}${record.id}.json`;
  await put(key, JSON.stringify(record), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return record;
}

// Derive a record id from its blob pathname (`feedback/<id>.json`).
function idFromPathname(pathname) {
  return pathname.slice(RECORD_PREFIX.length).replace(/\.json$/, '');
}

// Write the given imported tester records, then delete any previously-imported
// records that are no longer in the set. Scoped strictly to `imported-` ids, so
// real in-app submissions (timestamp-uuid ids) are never touched. Returns how
// many were written and removed.
export async function reconcileImportedFeedback(records) {
  for (const record of records) {
    await saveFeedback(record);
  }
  const keepIds = new Set(records.map((r) => r.id));
  const { blobs } = await list({ prefix: RECORD_PREFIX });
  const staleUrls = blobs
    .filter((b) => {
      const id = idFromPathname(b.pathname);
      return id.startsWith('imported-') && !keepIds.has(id);
    })
    .map((b) => b.url);
  if (staleUrls.length > 0) {
    await del(staleUrls);
  }
  return { imported: records.length, removed: staleUrls.length };
}

// Fetch a single feedback record by id (cache-busted), or null if missing.
async function readFeedback(id) {
  try {
    const key = `${RECORD_PREFIX}${id}.json`;
    const { blobs } = await list({ prefix: key });
    const match = blobs.find((b) => b.pathname === key);
    if (!match) return null;
    const base = match.downloadUrl;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('readFeedback error:', error);
    return null;
  }
}

// Update a record's triage status ('open' | 'done'). Returns the updated
// record, or null if the id doesn't exist. Merges immutably and re-saves.
export async function updateFeedbackStatus(id, status) {
  const existing = await readFeedback(id);
  if (!existing) return null;
  const updated = { ...existing, status };
  await saveFeedback(updated);
  return updated;
}

// All feedback records, newest first. Reads each fresh (cache-busted) so the
// admin view never shows a stale CDN copy.
export async function listFeedback() {
  try {
    const { blobs } = await list({ prefix: RECORD_PREFIX });
    const records = await Promise.all(
      blobs.map(async (b) => {
        try {
          const base = b.downloadUrl;
          const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      })
    );
    return records
      .filter(Boolean)
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  } catch (error) {
    console.error('listFeedback error:', error);
    return [];
  }
}
