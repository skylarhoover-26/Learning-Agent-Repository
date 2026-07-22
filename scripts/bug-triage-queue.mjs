#!/usr/bin/env node
// Lists AI-flagged Bug feedback that's still open and hasn't had a fix
// attempted yet. Used by the scheduled auto-fix agent to pick its next batch.
// Usage: node scripts/bug-triage-queue.mjs
import { list } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';

loadEnvLocal();

async function fetchJson(blob) {
  try {
    const res = await fetch(blob.downloadUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

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

const { blobs } = await list({ prefix: 'feedback/' });
const records = (await Promise.all(blobs.map(fetchJson))).filter(Boolean);

const queue = records.filter((r) =>
  r.category === 'Bug' &&
  r.aiBugVerdict === 'likely_bug' &&
  r.status !== 'done' &&
  !r.draftPrUrl &&
  !r.autoFixAttemptedAt
);

console.log(JSON.stringify(queue, null, 2));
