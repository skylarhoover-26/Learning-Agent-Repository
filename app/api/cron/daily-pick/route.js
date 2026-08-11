// Native Vercel Cron trigger for the Monday–Friday daily-pick Slack DM.
// Scheduled in vercel.json. Vercel automatically sends
// `Authorization: Bearer ${CRON_SECRET}` on cron invocations, which we verify.
//
// Idempotency: guarded so it fires at most once per content-day (8 AM PT rollover),
// so this, the catch-up cron (/api/cron/daily-pick-catchup) and the legacy n8n trigger
// (/api/notifications/daily) can't double-DM anyone — whichever runs first claims the
// day; the others no-op. The admin "Send now" test bypasses the guard deliberately
// (it calls sendDailyNotifications directly).
//
// The guard and its instrumentation live in lib/daily-send-guard.js. Every outcome —
// entered, skipped, sent, failed — is written to the audit log, so a morning with no
// DMs can be diagnosed rather than guessed at. That went in after three Mondays went
// missing leaving no evidence either way.

import { NextResponse } from 'next/server';
import { claimDayAndSend } from '@/lib/daily-send-guard';
import { contentDayKey } from '@/lib/content-day';

// 300, not 60: each recipient now resolves their pick AND reads their XP /
// lesson ledgers for the streak line, so per-person work grew. Sends stay
// sequential for Slack's rate limits, so headroom scales with the allowlist.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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
  try {
    return NextResponse.json(await claimDayAndSend('cron'));
  } catch (error) {
    console.error('GET /api/cron/daily-pick error:', error);
    return NextResponse.json({ error: 'Send failed', date: contentDayKey() }, { status: 500 });
  }
}

export async function GET(request) {
  return run(request);
}

// Allow POST too, so the same guarded path can be triggered manually if needed.
export async function POST(request) {
  return run(request);
}
