import { get, put, list } from '@vercel/blob';

// Central JSON-blob read/write.
//
// BACKGROUND — why this is gated. Every store used to do its own
// `list({prefix}) + fetch(downloadUrl)`, which works only because the blobs were
// written `access: 'public'`: anyone holding a URL could read them (security
// review F-05). The first attempt at fixing that simply switched the writes to
// `access: 'private'` and shipped. It broke every write in production, because a
// Vercel Blob store's access mode is fixed AT STORE CREATION and
// `learning-agent-blob` is a PUBLIC store:
//
//   Vercel Blob: Cannot use private access on a public store.
//
// So private JSON needs a SECOND, private store. That is what
// PRIVATE_READ_WRITE_TOKEN points at.
//
// THE GATE: with PRIVATE_READ_WRITE_TOKEN unset, this module behaves exactly like
// the old code — public writes to the default store. Setting the env var is what
// switches JSON to the private store. That makes deploying this safe on its own
// and makes the cutover (and the rollback) a single env change, not a redeploy.
//
// Feedback screenshots and recordings do NOT come through here — they are
// binary, not JSON, and live in lib/blob-media.js, which puts them in the same
// private store and serves them via the /api/feedback/media proxy.

const PRIVATE_TOKEN = process.env.PRIVATE_READ_WRITE_TOKEN;

// True once the private store is configured. Exported so health checks and the
// migration script can report which mode the app is actually in.
export const privateStoreEnabled = !!PRIVATE_TOKEN;

async function readPrivate(pathname, fresh) {
  if (!PRIVATE_TOKEN) return null;
  try {
    // useCache:false skips the CDN — needed for read-after-write correctness on
    // the hot paths (XP totals especially; a cached copy is what made admin
    // grants look like they did nothing).
    const res = await get(pathname, {
      access: 'private',
      useCache: !fresh,
      token: PRIVATE_TOKEN,
    });
    if (res?.statusCode === 200 && res.stream) {
      return await new Response(res.stream).json();
    }
    return null;
  } catch {
    return null;
  }
}

// The pre-existing public path, still used for the default store and as the
// fallback for anything not yet migrated into the private store.
async function readPublic(pathname, fresh) {
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
// — every caller treats a missing blob as "no data yet", never as an error.
//
// Private-first, then public: during the cutover a given key may live in either
// store, and after it, the public copy is the thing being retired.
export async function readJsonBlob(pathname, { fresh = true } = {}) {
  const priv = await readPrivate(pathname, fresh);
  if (priv !== null) return priv;
  return readPublic(pathname, fresh);
}

// Write a JSON blob at a stable pathname — private store when configured,
// otherwise the public store exactly as before.
export async function writeJsonBlob(pathname, data, options = {}) {
  const body = JSON.stringify(data);
  const common = {
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...options,
  };
  if (PRIVATE_TOKEN) {
    return put(pathname, body, { ...common, access: 'private', token: PRIVATE_TOKEN });
  }
  return put(pathname, body, { ...common, access: 'public' });
}
