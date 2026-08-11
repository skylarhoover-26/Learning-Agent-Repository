#!/usr/bin/env node
/**
 * Copy feedback media (screenshots + screen recordings) from the PUBLIC store
 * into the PRIVATE store.
 *
 * These are the sensitive files in Blob — a screen recording of someone using
 * the app can show names, emails, and other people's data — and they were
 * written `access: 'public'`, readable by anyone holding the URL (F-05).
 *
 * Pathnames are preserved, and /api/feedback/media resolves by pathname reading
 * private-then-public, so stored feedback records never need rewriting.
 *
 * COPY, not move. Verify playback in the admin UI, then --cleanup to delete the
 * public originals. That ordering keeps the whole cutover reversible.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<public> BLOB_PRIVATE_RW_TOKEN=<private> \
 *     node scripts/migrate-media-private.mjs --dry-run
 *   …same env… node scripts/migrate-media-private.mjs
 *   …same env… node scripts/migrate-media-private.mjs --verify
 *   …same env… node scripts/migrate-media-private.mjs --cleanup
 */
import { list, head, put, del } from '@vercel/blob';

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const CLEANUP = process.argv.includes('--cleanup');

const MEDIA_PREFIXES = ['feedback-screenshots/', 'feedback-recordings/'];

const PUBLIC_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PRIVATE_TOKEN = process.env.BLOB_PRIVATE_RW_TOKEN;

if (!PUBLIC_TOKEN || !PRIVATE_TOKEN) {
  console.error('Both BLOB_READ_WRITE_TOKEN (source) and BLOB_PRIVATE_RW_TOKEN (target) are required.');
  process.exit(1);
}
if (PUBLIC_TOKEN === PRIVATE_TOKEN) {
  console.error('Both tokens are identical — that would target one store. Check which is which.');
  process.exit(1);
}

const mb = (n) => `${(n / 1048576).toFixed(2)}MB`;

async function eachPublicMediaBlob(fn) {
  for (const prefix of MEDIA_PREFIXES) {
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 500, token: PUBLIC_TOKEN });
      for (const b of page.blobs) await fn(b);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
}

// Present in the private store, and the same size?
async function privateTwin(pathname) {
  try {
    return await head(pathname, { token: PRIVATE_TOKEN });
  } catch {
    return null;
  }
}

async function migrate() {
  let copied = 0, already = 0, failed = 0, bytes = 0;
  await eachPublicMediaBlob(async (b) => {
    try {
      const twin = await privateTwin(b.pathname);
      if (twin && twin.size === b.size) { already += 1; return; }
      if (DRY_RUN) { console.log(`would copy: ${b.pathname} (${mb(b.size)})`); copied += 1; bytes += b.size; return; }

      const res = await fetch(b.downloadUrl || b.url);
      if (!res.ok) throw new Error(`source fetch ${res.status}`);
      // Buffer rather than stream: put() needs a known length for these, and the
      // largest file here is ~11MB.
      const body = Buffer.from(await res.arrayBuffer());
      await put(b.pathname, body, {
        access: 'private',
        contentType: b.contentType || 'application/octet-stream',
        addRandomSuffix: false, // the random suffix is already in the pathname
        allowOverwrite: true,
        token: PRIVATE_TOKEN,
      });
      copied += 1; bytes += b.size;
      console.log(`copied ${b.pathname} (${mb(b.size)})`);
    } catch (err) {
      console.error(`FAILED ${b.pathname}:`, err.message);
      failed += 1;
    }
  });
  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}copied ${copied} (${mb(bytes)}), already present ${already}, failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

async function verify() {
  let ok = 0, missing = 0, sizeMismatch = 0;
  await eachPublicMediaBlob(async (b) => {
    const twin = await privateTwin(b.pathname);
    if (!twin) { console.error(`MISSING in private: ${b.pathname}`); missing += 1; return; }
    if (twin.size !== b.size) { console.error(`SIZE MISMATCH: ${b.pathname} public=${b.size} private=${twin.size}`); sizeMismatch += 1; return; }
    ok += 1;
  });
  console.log(`\nverified ${ok} matching, ${missing} missing, ${sizeMismatch} size mismatches`);
  if (missing || sizeMismatch) process.exitCode = 1;
}

async function cleanup() {
  let deleted = 0, blocked = 0;
  await eachPublicMediaBlob(async (b) => {
    const twin = await privateTwin(b.pathname);
    if (!twin || twin.size !== b.size) {
      console.error(`REFUSING to delete, no matching private copy: ${b.pathname}`);
      blocked += 1; return;
    }
    if (DRY_RUN) { console.log(`would delete public copy: ${b.pathname}`); deleted += 1; return; }
    await del(b.url, { token: PUBLIC_TOKEN });
    deleted += 1;
    console.log(`deleted public copy: ${b.pathname}`);
  });
  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}deleted ${deleted}, refused ${blocked}`);
  if (blocked > 0) process.exitCode = 1;
}

const run = VERIFY ? verify : CLEANUP ? cleanup : migrate;
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
