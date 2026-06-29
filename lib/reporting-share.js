import { put, list } from '@vercel/blob';
import { randomUUID } from 'crypto';

// Public, tokenized share links for the reporting view. An admin/manager mints a
// token scoped to a filter (team / manager / person); anyone with the link can
// view ONLY that slice, read-only, without signing in. Tokens are random and
// expire. Stored as one blob per token.
function shareKey(token) {
  return `reporting-shares/${token}.json`;
}

export async function createShareToken({ filters = {}, createdBy = '', ttlDays = 90 } = {}) {
  const token = randomUUID();
  const now = Date.now();
  const record = {
    token,
    filters: {
      team: filters.team || '',
      manager: filters.manager || '',
      person: filters.person || '',
    },
    createdBy,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlDays * 86400000).toISOString(),
  };
  await put(shareKey(token), JSON.stringify(record), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return record;
}

export async function getShareToken(token) {
  // UUID shape only — cheap guard against probing the blob store with junk.
  if (!token || !/^[0-9a-f-]{16,}$/i.test(token)) return null;
  try {
    const { blobs } = await list({ prefix: shareKey(token), limit: 1 });
    if (!blobs.length) return null;
    const base = blobs[0].downloadUrl;
    const res = await fetch(`${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const rec = await res.json();
    if (rec.expiresAt && Date.parse(rec.expiresAt) < Date.now()) return null; // expired
    return rec;
  } catch {
    return null;
  }
}
