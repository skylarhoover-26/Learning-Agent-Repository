import { put, list, del } from '@vercel/blob';

function userKey(learnerId, dataType) {
  return `users/${learnerId}/${dataType}.json`;
}

export async function getUserData(learnerId, dataType) {
  try {
    const key = userKey(learnerId, dataType);
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return null;
    // Read fresh: blobs keep the same URL on overwrite, so without a cache-bust
    // + no-store we'd get the previously-cached (stale) copy after a write —
    // which is exactly why admin XP grants appeared to do nothing.
    const base = blobs[0].downloadUrl;
    const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveUserData(learnerId, dataType, data) {
  try {
    const key = userKey(learnerId, dataType);
    // Overwrite in place (allowOverwrite) instead of delete-then-put. The old
    // del+put left a brief window where the blob didn't exist, which made
    // read-after-write races worse for rapid admin grants.
    const blob = await put(key, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      // User data changes often — don't let the CDN serve a stale copy after an
      // overwrite (this is what broke admin XP grants reading back old totals).
      cacheControlMaxAge: 0,
    });
    return blob;
  } catch (error) {
    console.error(`Blob save error (${dataType}):`, error);
    throw error;
  }
}

export async function deleteUserData(learnerId, dataType) {
  try {
    const key = userKey(learnerId, dataType);
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    return true;
  } catch (error) {
    console.error(`Blob delete error (${dataType}):`, error);
    throw error;
  }
}

export async function listUserDataTypes(learnerId) {
  try {
    const prefix = `users/${learnerId}/`;
    const { blobs } = await list({ prefix });
    return blobs.map(b => {
      const name = b.pathname.replace(prefix, '').replace('.json', '');
      return { name, url: b.url, size: b.size, uploadedAt: b.uploadedAt };
    });
  } catch {
    return [];
  }
}
