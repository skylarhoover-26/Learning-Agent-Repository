// Is blob storage actually working? Answered by doing it, not by inspecting config.
//
// WHY THIS EXISTS. Blob writes stopped reaching the store around 2026-07-15 and
// nobody noticed for a month. Not because the failure was subtle — because every
// write path swallows its own errors:
//
//   logAuditEntry            catch → return null
//   buildAndStoreLeaderboard catch → console.error, return the snapshot anyway
//   writeBlob (curriculum)   catch → console.error
//   saveUserData             throws, but POST /api/user-data catches → 500,
//                            and the client is local-first so the user sees nothing
//
// Each of those is individually defensible: a failed audit write should not break
// a lesson. Together they mean "storage is completely broken" and "storage is
// fine" produce identical observable behaviour. Supabase serving reads finished
// the illusion.
//
// So this does a real round-trip — write, read back, delete — against each
// configured store, plus reports the newest write it can see per prefix. A stale
// `newestWrite` with a passing round-trip means writes are landing somewhere
// nothing reads; a failing round-trip names the error instead of hiding it.

import { put, get, del, list } from '@vercel/blob';

const PRIVATE_TOKEN = process.env.PRIVATE_READ_WRITE_TOKEN;

// A FRESH probe path per run, deleted at the end. Reusing one pathname breaks
// this check: after a del(), a put() to the same pathname returns a URL that
// 404s for a short window, so every run after the first read back its own write
// as missing and reported a healthy store as broken. Measured, not assumed —
// overwrite-in-place reads back immediately; del-then-put does not.
function probePath() {
  return `__health__/probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
}

// The prefixes worth reporting freshness for — the ones whose staleness was the
// original symptom.
const WATCHED_PREFIXES = ['users/', 'audit/', 'leaderboard/', 'shared/', 'daily/'];

function tokenArg(token) {
  return token ? { token } : {};
}

// Write → read → delete. Returns what happened at each step rather than a bare
// boolean, because "write succeeded, read came back empty" is a different fault
// from "write rejected" and the distinction is the whole point.
async function roundTrip(access, token) {
  const path = probePath();
  const stamp = { probedAt: new Date().toISOString(), nonce: Math.random().toString(36).slice(2) };
  const result = { write: 'fail', read: 'fail', cleanup: 'fail', error: null };

  let written;
  try {
    written = await put(path, JSON.stringify(stamp), {
      access,
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
      ...tokenArg(token),
    });
    result.write = 'ok';
  } catch (error) {
    result.error = `write: ${error?.message || error}`;
    return result;
  }

  try {
    let readBack = null;
    if (access === 'private') {
      const res = await get(path, { access: 'private', useCache: false, ...tokenArg(token) });
      if (res?.statusCode === 200 && res.stream) readBack = await new Response(res.stream).json();
    } else {
      // Read the URL put() just returned rather than re-listing — one fewer
      // round trip, and it is the authoritative URL for the write we just did.
      // Cache-busted the same way readPublic() in lib/blob-json.js is: a blob
      // keeps its pathname on overwrite, so the CDN would otherwise be free to
      // serve an older body.
      const base = written.downloadUrl || written.url;
      const url = `${base}${base.includes('?') ? '&' : '?'}_=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) readBack = await res.json();
    }
    // Compare the nonce, not just "did something come back" — a cached copy of a
    // previous probe would otherwise read as success.
    result.read = readBack?.nonce === stamp.nonce ? 'ok' : 'stale';
  } catch (error) {
    result.error = `read: ${error?.message || error}`;
  }

  try {
    await del(path, tokenArg(token));
    result.cleanup = 'ok';
  } catch (error) {
    result.error = result.error || `cleanup: ${error?.message || error}`;
  }

  return result;
}

// Newest write this store can see, per prefix. `count: 0` on a prefix that
// should be busy is the signal that writes are going elsewhere.
async function freshness(token) {
  const out = {};
  for (const prefix of WATCHED_PREFIXES) {
    try {
      const { blobs } = await list({ prefix, limit: 1000, ...tokenArg(token) });
      // uploadedAt is a Date, and a default .sort() would compare Dates as
      // strings — ordering them by weekday name, which reported Jun 30 as newer
      // than Jul 14. Compare epoch milliseconds.
      const newestMs = blobs.reduce((max, b) => {
        const ms = new Date(b.uploadedAt).getTime();
        return Number.isFinite(ms) && ms > max ? ms : max;
      }, -Infinity);
      const hasNewest = Number.isFinite(newestMs);
      out[prefix] = {
        count: blobs.length,
        newestWrite: hasNewest ? new Date(newestMs).toISOString() : null,
        ageDays: hasNewest ? Math.floor((Date.now() - newestMs) / 86400000) : null,
      };
    } catch (error) {
      out[prefix] = { count: null, newestWrite: null, ageDays: null, error: error?.message || String(error) };
    }
  }
  return out;
}

async function checkStore(name, access, token) {
  const [probe, prefixes] = await Promise.all([roundTrip(access, token), freshness(token)]);
  const writable = probe.write === 'ok' && probe.read === 'ok';
  return { store: name, access, configured: true, writable, probe, prefixes };
}

// Full report. Never throws — a diagnostic that can 500 is one more thing to
// debug when something is already wrong.
export async function blobHealth() {
  const stores = [];

  stores.push(await checkStore('default (public)', 'public', undefined));

  if (PRIVATE_TOKEN) {
    stores.push(await checkStore('private', 'private', PRIVATE_TOKEN));
  } else {
    stores.push({
      store: 'private',
      access: 'private',
      configured: false,
      writable: false,
      note: 'PRIVATE_READ_WRITE_TOKEN is not set — JSON writes fall back to the public store.',
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    privateStoreEnabled: !!PRIVATE_TOKEN,
    stores,
    // Stated rather than implied, because the whole reason this file exists is
    // that a broken write path looked exactly like a working one.
    reading: 'A store with writable=true but a months-old newestWrite is receiving no traffic — writes are landing somewhere nothing reads.',
  };
}
