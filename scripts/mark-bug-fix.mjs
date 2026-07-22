#!/usr/bin/env node
// Records the outcome of an auto-fix attempt on a Bug feedback record, so the
// scheduled agent never reprocesses it.
// Usage:
//   node scripts/mark-bug-fix.mjs <feedback-id> --pr <draft-pr-url>
//   node scripts/mark-bug-fix.mjs <feedback-id> --skip "<reason a human should look instead>"
import { list, put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

loadEnvLocal();

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^"(.*)"$/, '$1');
  }
}

const [id, flag, value] = process.argv.slice(2);
if (!id || !['--pr', '--skip'].includes(flag) || !value) {
  console.error('Usage: node scripts/mark-bug-fix.mjs <feedback-id> --pr <url>  |  --skip "<reason>"');
  process.exit(1);
}

const key = `feedback/${id}.json`;
const { blobs } = await list({ prefix: key });
const match = blobs.find((b) => b.pathname === key);
if (!match) {
  console.error(`No feedback record found for id ${id}`);
  process.exit(1);
}
const record = await (await fetch(match.downloadUrl, { cache: 'no-store' })).json();

const updated = {
  ...record,
  autoFixAttemptedAt: new Date().toISOString(),
  ...(flag === '--pr' ? { draftPrUrl: value } : { autoFixSkipReason: value }),
};

await put(key, JSON.stringify(updated), {
  access: 'public',
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 0,
});

console.log(`Updated ${id}: ${flag === '--pr' ? `draftPrUrl=${value}` : `skipped (${value})`}`);
