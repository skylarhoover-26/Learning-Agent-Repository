import { get, put, list, del } from '@vercel/blob';

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

// ---------------------------------------------------------------------------
// Store-aware discovery and deletion
// ---------------------------------------------------------------------------
//
// The cutover moved WRITES to the private store but left every `list()` and
// `del()` call site on the bare SDK import, which resolves to the default
// (public) store via BLOB_READ_WRITE_TOKEN. Reads were fine — readJsonBlob is
// private-first — so nothing looked broken, but anything that DISCOVERS blobs by
// listing them silently stopped seeing new data on the cutover date:
//
//   lib/audit-log.js   the admin audit log froze at the cutover
//   lib/reporting.js   the reporting page enumerates users/ — saw one person
//   lib/blob-store.js  listUserDataTypes, so team-scores missed data
//
// and anything that DELETES only removed the public copy, leaving the private
// one to win the next read — which made the admin reset routes look like they
// had worked when they had not.
//
// Both helpers below span the two stores. That is deliberate and outlives the
// migration: during it, a key can be in either store, and after it, listing a
// store that is empty simply contributes nothing.

const EMPTY_PAGE = { blobs: [], folders: [], hasMore: false };

// One store, one page. A store that errors (or isn't configured) contributes
// nothing rather than failing the whole listing — during the migration either
// store may legitimately be empty.
async function listOnePage(options, token) {
  try {
    return await list(token ? { ...options, token } : options);
  } catch {
    return EMPTY_PAGE;
  }
}

// One store, every page. Without an explicit limit the SDK caps a listing at
// 1000, which is exactly the kind of silent truncation that would quietly drop
// people off the reporting page as the company grows — so when the caller does
// not set a limit, walk the cursor to exhaustion.
async function listOneStore(options, token) {
  if (options.limit) return listOnePage(options, token);

  const blobs = [];
  const folders = [];
  let cursor;
  do {
    const page = await listOnePage(cursor ? { ...options, cursor } : options, token);
    blobs.push(...(page.blobs || []));
    folders.push(...(page.folders || []));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return { blobs, folders, hasMore: false };
}

// List across both stores, private first so its entry wins on a pathname clash
// (it is the newer copy by definition — the public one is what migration leaves
// behind). Supports `mode: 'folded'`, which audit-log relies on.
//
// `cursor` is deliberately NOT returned: a single cursor cannot address a
// position in two independent stores. Callers page by raising `limit`, or omit
// it entirely and get everything.
export async function listJsonBlobs(options = {}) {
  const [priv, pub] = await Promise.all([
    PRIVATE_TOKEN ? listOneStore(options, PRIVATE_TOKEN) : EMPTY_PAGE,
    listOneStore(options),
  ]);

  const byPath = new Map();
  for (const b of [...(priv.blobs || []), ...(pub.blobs || [])]) {
    if (!byPath.has(b.pathname)) byPath.set(b.pathname, b);
  }

  return {
    blobs: [...byPath.values()],
    folders: [...new Set([...(priv.folders || []), ...(pub.folders || [])])],
    // True only when an explicit limit truncated a store — with no limit, both
    // sides were walked to the end.
    hasMore: Boolean(priv.hasMore || pub.hasMore),
  };
}

// Delete a JSON blob from BOTH stores. Deleting only the public copy leaves the
// private one to be served on the next read, so a partial delete reads as data
// that refuses to die. Addressed by pathname, not URL — a private blob has no
// meaningful public URL to delete by.
export async function delJsonBlob(pathname) {
  const targets = PRIVATE_TOKEN
    ? [del(pathname, { token: PRIVATE_TOKEN }), del(pathname)]
    : [del(pathname)];
  // allSettled: one store not holding the key is the normal case, not an error.
  await Promise.allSettled(targets);
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
