#!/usr/bin/env node
/**
 * Copy every JSON blob from the PUBLIC store into the PRIVATE store.
 *
 * A Vercel Blob store's access mode is fixed at creation — a public store
 * rejects `access: 'private'` writes outright — so closing security review F-05
 * means standing up a second, private store and moving the JSON into it. This
 * script does the moving.
 *
 * Media is deliberately left behind: feedback screenshots and recordings stay in
 * the public store because the admin UI renders them through <img>/<video> src,
 * which cannot carry an auth header.
 *
 * This is COPY, not move — nothing is deleted from the public store. Verify the
 * app on the private store first, then delete the public copies with --cleanup
 * once you're confident. That ordering is what makes the cutover reversible.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<public> BLOB_PRIVATE_RW_TOKEN=<private> \
 *     node scripts/migrate-blobs-private.mjs --dry-run
 *   …same env… node scripts/migrate-blobs-private.mjs
 *   …same env… node scripts/migrate-blobs-private.mjs --verify
 *   …same env… node scripts/migrate-blobs-private.mjs --cleanup   # after verifying
 */
import { list, get, put, del } from '@vercel/blob';

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const CLEANUP = process.argv.includes('--cleanup');

// Left in the public store on purpose — rendered via <img>/<video> src.
const PUBLIC_ONLY_PREFIXES = ['feedback-shots/', 'feedback-recordings/'];

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

const isJsonData = (p) => p.endsWith('.json') && !PUBLIC_ONLY_PREFIXES.some((x) => p.startsWith(x));

async function readPublicJson(pathname) {
  const { blobs } = await list({ prefix: pathname, limit: 1, token: PUBLIC_TOKEN });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].downloadUrl || blobs[0].url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function readPrivateJson(pathname) {
  try {
    const res = await get(pathname, { access: 'private', useCache: false, token: PRIVATE_TOKEN });
    if (res?.statusCode === 200 && res.stream) return await new Response(res.stream).json();
    return null;
  } catch {
    return null;
  }
}

async function eachPublicJsonBlob(fn) {
  let cursor;
  do {
    const page = await list({ cursor, limit: 500, token: PUBLIC_TOKEN });
    for (const b of page.blobs) if (isJsonData(b.pathname)) await fn(b);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

async function migrate() {
  let copied = 0, already = 0, failed = 0;
  await eachPublicJsonBlob(async (b) => {
    const path = b.pathname;
    try {
      if (await readPrivateJson(path)) { already += 1; return; }
      const data = await readPublicJson(path);
      if (data === null) { console.warn(`unreadable, skipped: ${path}`); failed += 1; return; }
      if (DRY_RUN) { console.log(`would copy: ${path}`); copied += 1; return; }
      await put(path, JSON.stringify(data), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
        token: PRIVATE_TOKEN,
      });
      copied += 1;
      if (copied % 25 === 0) console.log(`copied ${copied}…`);
    } catch (err) {
      console.error(`FAILED ${path}:`, err.message);
      failed += 1;
    }
  });
  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}copied ${copied}, already present ${already}, failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

// Every public JSON blob must have a byte-identical private twin.
async function verify() {
  let ok = 0, missing = 0, differs = 0;
  await eachPublicJsonBlob(async (b) => {
    const path = b.pathname;
    const [pub, priv] = await Promise.all([readPublicJson(path), readPrivateJson(path)]);
    if (priv === null) { console.error(`MISSING in private: ${path}`); missing += 1; return; }
    if (JSON.stringify(pub) !== JSON.stringify(priv)) { console.error(`DIFFERS: ${path}`); differs += 1; return; }
    ok += 1;
  });
  console.log(`\nverified ${ok} identical, ${missing} missing, ${differs} differing`);
  if (missing || differs) process.exitCode = 1;
}

// Only after the app has been verified against the private store.
async function cleanup() {
  let deleted = 0, blocked = 0;
  await eachPublicJsonBlob(async (b) => {
    const path = b.pathname;
    const priv = await readPrivateJson(path);
    if (priv === null) { console.error(`REFUSING to delete, no private copy: ${path}`); blocked += 1; return; }
    if (DRY_RUN) { console.log(`would delete public copy: ${path}`); deleted += 1; return; }
    await del(b.url, { token: PUBLIC_TOKEN });
    deleted += 1;
  });
  console.log(`\n${DRY_RUN ? '[dry run] ' : ''}deleted ${deleted} public copies, refused ${blocked}`);
  if (blocked > 0) process.exitCode = 1;
}

const run = VERIFY ? verify : CLEANUP ? cleanup : migrate;
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
