import { list } from '@vercel/blob';
import fs from 'node:fs';
const env = fs.readFileSync('/private/tmp/claude-502/-Users-skylarhoover/46e8f39a-7bc1-4cd8-9758-bb9440f5181b/scratchpad/.env.prod', 'utf8');
const token = env.match(/BLOB_READ_WRITE_TOKEN="?([^"\n]+)"?/)[1];

const { blobs } = await list({ prefix: 'users/', token, limit: 1000 });
console.log('total blobs under users/:', blobs.length);
// Unique user folders
const users = new Set();
for (const b of blobs) {
  const mm = b.pathname.match(/^users\/([^/]+)\//);
  if (mm) users.add(mm[1]);
}
console.log('distinct user folders:', users.size);
[...users].sort().forEach((u) => console.log('  ', u));

// Also any blobs that look like XP, to gauge data presence
const xpFiles = blobs.filter((b) => b.pathname.includes('lp_xp_'));
console.log('\nlp_xp files:', xpFiles.length);
xpFiles.slice(0, 20).forEach((b) => console.log('  ', b.pathname, `(${b.size}b, ${b.uploadedAt})`));
