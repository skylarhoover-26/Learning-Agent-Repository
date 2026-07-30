import { put, list, del } from '@vercel/blob';

const BLOB_PREFIX = 'daily/';

function blobKey(date) {
  return `${BLOB_PREFIX}${date}.json`;
}

export async function readDailyLessons(date) {
  try {
    const key = blobKey(date);
    const { blobs } = await list({ prefix: key, limit: 1 });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].downloadUrl);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function writeDailyLessons(date, data) {
  try {
    const key = blobKey(date);
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    await put(key, JSON.stringify(data), {
      // REQUIRED by @vercel/blob v2 — without it put() throws "access must be
      // 'private' or 'public'", and the catch below turned that into a silent
      // no-op. Every daily-lessons write failed this way; the `daily/` prefix
      // did not exist in the store at all.
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error(`Daily lessons write error (${date}):`, error);
  }
}

export async function getAvailableDates(maxDates = 30) {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: maxDates });
    return blobs
      .map(b => {
        const match = b.pathname.match(/daily\/(\d{4}-\d{2}-\d{2})\.json/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

export function todayDateString() {
  return new Date().toISOString().split('T')[0];
}
