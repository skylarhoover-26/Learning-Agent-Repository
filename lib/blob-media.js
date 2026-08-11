import { get, put, list } from '@vercel/blob';

// Feedback media (screenshots + screen recordings) storage.
//
// These are the most sensitive things in Blob: a screen recording of someone
// using the app can show names, emails, and other people's data. They were
// written `access: 'public'`, i.e. readable by anyone holding the URL
// (security review F-05).
//
// A Blob store's access mode is fixed at creation, so private media needs the
// separate private store that BLOB_PRIVATE_RW_TOKEN points at. Reads then go
// through /api/feedback/media, which is session- and admin-gated.
//
// THE GATE: with BLOB_PRIVATE_RW_TOKEN unset this behaves exactly as before —
// public writes to the default store, and the proxy still serves them by reading
// the public copy. Setting the env var moves new uploads to the private store.
// Reads try private first and fall back to public, so media written either side
// of the cutover keeps working and no stored URL ever has to be rewritten.

const PRIVATE_TOKEN = process.env.BLOB_PRIVATE_RW_TOKEN;

export const mediaStoreIsPrivate = !!PRIVATE_TOKEN;

// Token for client-upload minting (app/api/feedback/upload). Undefined means
// "use the default BLOB_READ_WRITE_TOKEN", i.e. the public store.
export function mediaUploadToken() {
  return PRIVATE_TOKEN || undefined;
}

// Server-side media write (used for screenshots; recordings upload direct from
// the browser). Private store when configured, public store otherwise.
export async function putMedia(pathname, body, options = {}) {
  const common = { addRandomSuffix: true, ...options };
  if (PRIVATE_TOKEN) {
    return put(pathname, body, { ...common, access: 'private', token: PRIVATE_TOKEN });
  }
  return put(pathname, body, { ...common, access: 'public' });
}

async function headPublicUrl(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const hit = blobs.find((b) => b.pathname === pathname) || blobs[0];
  return hit ? hit.downloadUrl || hit.url : null;
}

// Read media for the proxy. Returns { stream, status, headers } or null.
//
// `range` is forwarded so <video> seeking works — without a 206 response the
// browser can only play a recording straight through from the start.
export async function readMedia(pathname, { range } = {}) {
  const extraHeaders = range ? { range } : undefined;

  if (PRIVATE_TOKEN) {
    try {
      const res = await get(pathname, {
        access: 'private',
        useCache: false,
        token: PRIVATE_TOKEN,
        ...(extraHeaders ? { headers: extraHeaders } : {}),
      });
      if (res?.stream) {
        return { stream: res.stream, status: res.statusCode || 200, headers: res.headers };
      }
    } catch {
      // Not in the private store (e.g. uploaded before the cutover) — fall through.
    }
  }

  try {
    const url = await headPublicUrl(pathname);
    if (!url) return null;
    const res = await fetch(url, { headers: extraHeaders, cache: 'no-store' });
    if (!res.ok && res.status !== 206) return null;
    return { stream: res.body, status: res.status, headers: res.headers };
  } catch {
    return null;
  }
}
