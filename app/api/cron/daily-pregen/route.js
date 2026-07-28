// Pre-generates each recipient's Today's Pick lesson (plan + first teach step)
// and caches it, so the Slack "your pick is ready" link — and the in-app card —
// open instantly instead of cold-generating. Scheduled in vercel.json to run
// ~20 min BEFORE the daily-pick Slack send (which is 8:30 AM PT), so the cache
// is warm by the time anyone clicks.
//
// Best-effort + bounded: generation is slow (~40-60s/user on Sonnet), so within
// one function budget we can't warm a huge team. We run a few in parallel until
// a soft deadline, then stop — anyone not reached falls back to warm-on-open
// (when they land on home) or on-click generation. Never worse than today.

import { NextResponse } from 'next/server';
import { getNotifyAllowlist } from '@/lib/notify-allowlist';
import { getUserData } from '@/lib/blob-store';
import { withEffectiveTier } from '@/lib/auth-helpers';
import { ensureDailyPickLesson } from '@/lib/daily-pick-lesson';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const CONCURRENCY = 4;
const SOFT_DEADLINE_MS = 250000; // stop starting new work with buffer under maxDuration

function isAuthorized(request) {
  const expected = process.env.CRON_SECRET || process.env.NOTIFY_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const header = request.headers.get('x-notify-secret');
  return bearer === expected || header === expected;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const emails = await getNotifyAllowlist();
  const deadline = Date.now() + SOFT_DEADLINE_MS;
  const stats = { recipients: emails.length, generated: 0, cached: 0, skipped: 0, failed: 0, notReached: 0 };

  let cursor = 0;
  async function worker() {
    while (cursor < emails.length) {
      if (Date.now() > deadline) { stats.notReached += (emails.length - cursor); cursor = emails.length; break; }
      const email = emails[cursor++];
      try {
        const stored = await getUserData(email, 'profile');
        const raw = stored?.data || stored;
        if (!raw?.department) { stats.skipped++; continue; } // not onboarded — no pick yet
        const profile = await withEffectiveTier({ ...raw, email }, email);
        const r = await ensureDailyPickLesson(profile);
        if (r?.generated) stats.generated++;
        else if (r?.cached) stats.cached++;
        else if (r?.skipped) stats.skipped++;
        else stats.failed++;
      } catch {
        stats.failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, emails.length || 1) }, worker));

  if (stats.notReached > 0) {
    console.warn(`daily-pregen: hit soft deadline, ${stats.notReached} recipient(s) not pre-generated (fall back to warm-on-open / on-click).`);
  }
  return NextResponse.json({ ok: true, ...stats });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
