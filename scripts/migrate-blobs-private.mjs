#!/usr/bin/env node
/**
 * One-time migration: rewrite every JSON blob as `access: 'private'`.
 *
 * Why: `access` is a property of the stored object, so the switch to private
 * writes (security review F-05) only protects data as it happens to be
 * rewritten. Everything already in the store stays publicly readable until
 * something overwrites it. This walks the store and rewrites each JSON blob in
 * place, which flips it.
 *
 * Media is deliberately skipped — feedback screenshots and recordings are
 * rendered by the admin UI through <img>/<video> src and would break if they
 * stopped being URL-readable. Closing that half of F-05 needs an authenticated
 * proxy route first.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... node scripts/migrate-blobs-private.mjs --dry-run
 *   BLOB_READ_WRITE_TOKEN=... node scripts/migrate-blobs-private.mjs
 *
 * The token must belong to the store the app actually uses (learning-agent-blob) —
 * check it before running, there is more than one store on this account.
 */
import { list, get, put } from '@vercel/blob';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_PREFIXES = ['feedback-shots/', 'feedback-recordings/'];

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is required.');
  process.exit(1);
}

async function readAny(pathname) {
  // Already private? Read it authenticated. Otherwise fall back to the public URL.
  try {
    const res = await get(pathname, { access: 'private', useCache: false });
    if (res?.statusCode === 200 && res.stream) {
      return { data: await new Response(res.stream).json(), alreadyPrivate: true };
    }
  } catch {
    // fall through to the public read
  }
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].downloadUrl || blobs[0].url, { cache: 'no-store' });
  if (!res.ok) return null;
  return { data: await res.json(), alreadyPrivate: false };
}

async function main() {
  let cursor;
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  do {
    const { blobs, cursor: next, hasMore } = await list({ cursor, limit: 500 });
    for (const b of blobs) {
      scanned += 1;
      const path = b.pathname;

      if (SKIP_PREFIXES.some((p) => path.startsWith(p)) || !path.endsWith('.json')) {
        skipped += 1;
        continue;
      }

      try {
        const result = await readAny(path);
        if (!result) {
          console.warn(`unreadable, skipped: ${path}`);
          failed += 1;
          continue;
        }
        if (result.alreadyPrivate) {
          skipped += 1;
          continue;
        }
        if (DRY_RUN) {
          console.log(`would migrate: ${path}`);
          migrated += 1;
          continue;
        }
        await put(path, JSON.stringify(result.data), {
          access: 'private',
          contentType: 'application/json',
          addRandomSuffix: false,
          allowOverwrite: true,
          cacheControlMaxAge: 0,
        });
        migrated += 1;
        if (migrated % 25 === 0) console.log(`migrated ${migrated}…`);
      } catch (err) {
        console.error(`FAILED ${path}:`, err.message);
        failed += 1;
      }
    }
    cursor = hasMore ? next : undefined;
  } while (cursor);

  console.log(
    `\n${DRY_RUN ? '[dry run] ' : ''}scanned ${scanned}, migrated ${migrated}, skipped ${skipped}, failed ${failed}`
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
