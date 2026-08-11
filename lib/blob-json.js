import { get, put, list } from '@vercel/blob';

// Central JSON-blob read/write. Every store in the app went through its own
// copy of `list({prefix}) + fetch(downloadUrl)`, which only works because the
// blobs were written `access: 'public'` — anyone holding a URL could read them
// (security review F-05). Writes are private now, and reads go through the
// authenticated SDK path.
//
// LEGACY FALLBACK: `access` is a property of the stored object, so blobs written
// before this change stay public until something overwrites them. readJsonBlob
// therefore tries the private read first and falls back to the old public fetch,
// which keeps existing data readable during the changeover. Run
// `scripts/migrate-blobs-private.mjs` to rewrite the backlog; once that has run
// everywhere, the fallback can be deleted.

export const BLOB_ACCESS = 'private';

async function readPrivate(pathname, fresh) {
  try {
    // useCache:false skips the CDN — needed for read-after-write correctness on
    // the hot paths (XP totals especially; a cached copy is what made admin
    // grants look like they did nothing).
    const res = await get(pathname, { access: 'private', useCache: !fresh });
    if (res?.statusCode === 200 && res.stream) {
      return await new Response(res.stream).json();
    }
    return null;
  } catch {
    return null;
  }
}

async function readLegacyPublic(pathname, fresh) {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    if (blobs.length === 0) return null;
    const base = blobs[0].downloadUrl || blobs[0].url;
    const url = fresh ? `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}` : base;
    const res = await fetch(url, fresh ? { cache: 'no-store' } : undefined);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Read and parse a JSON blob by pathname. Returns null when absent or unreadable
// — every caller here treats a missing blob as "no data yet", never as an error.
export async function readJsonBlob(pathname, { fresh = true } = {}) {
  const priv = await readPrivate(pathname, fresh);
  if (priv !== null) return priv;
  return readLegacyPublic(pathname, fresh);
}

// Write a JSON blob privately at a stable pathname.
export async function writeJsonBlob(pathname, data, options = {}) {
  return put(pathname, JSON.stringify(data), {
    access: BLOB_ACCESS,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...options,
  });
}
