import { list, del } from '@vercel/blob';
import { readJsonBlob, writeJsonBlob } from '@/lib/blob-json';

const BLOB_PREFIX = 'daily/';

function blobKey(date) {
  return `${BLOB_PREFIX}${date}.json`;
}

export async function readDailyLessons(date) {
  return readJsonBlob(blobKey(date), { fresh: false });
}

export async function writeDailyLessons(date, data) {
  try {
    const key = blobKey(date);
    const { blobs } = await list({ prefix: key, limit: 1 });
    for (const blob of blobs) {
      await del(blob.url);
    }
    // NOTE: `access` is REQUIRED by @vercel/blob v2 — without it put() throws
    // "access must be 'private' or 'public'", and the catch below turned that
    // into a silent no-op. Every daily-lessons write failed that way once; the
    // `daily/` prefix did not exist in the store at all. writeJsonBlob always
    // sets it.
    await writeJsonBlob(key, data);
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
