import { list, del } from '@vercel/blob';
import { readJsonBlob, writeJsonBlob } from '@/lib/blob-json';

function userKey(learnerId, dataType) {
  return `users/${learnerId}/${dataType}.json`;
}

export async function getUserData(learnerId, dataType) {
  // Read fresh: blobs keep the same pathname on overwrite, so a cached copy
  // after a write is the stale one — which is exactly why admin XP grants
  // appeared to do nothing.
  return readJsonBlob(userKey(learnerId, dataType), { fresh: true });
}

export async function saveUserData(learnerId, dataType, data) {
  try {
    const key = userKey(learnerId, dataType);
    // Overwrite in place (allowOverwrite) instead of delete-then-put. The old
    // del+put left a brief window where the blob didn't exist, which made
    // read-after-write races worse for rapid admin grants.
    return await writeJsonBlob(key, data, {
      // User data changes often — don't let the CDN serve a stale copy after an
      // overwrite (this is what broke admin XP grants reading back old totals).
      cacheControlMaxAge: 0,
    });
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
