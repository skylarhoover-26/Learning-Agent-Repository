// Native Vercel Cron trigger for the Monday–Friday daily-pick Slack DM.
// Scheduled in vercel.json. Vercel automatically sends
// `Authorization: Bearer ${CRON_SECRET}` on cron invocations, which we verify.
//
// Idempotency: guarded so it fires at most once per content-day (8 AM PT
// rollover). This lets it coexist with the legacy n8n trigger
// (/api/notifications/daily) without double-DMing anyone — whichever runs first
// claims the day; the second no-ops. The admin "Send now" test bypasses this
// guard (it calls sendDailyNotifications directly).

import { NextResponse } from 'next/server';
import { sendDailyNotifications } from '@/lib/daily-notify';
import { contentDayKey } from '@/lib/content-day';
import { getUserData, saveUserData } from '@/lib/blob-store';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_ID = '__system__';
const SENT_MARKER = 'daily_pick_last_sent';

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

  const today = contentDayKey();
  try {
    const marker = await getUserData(SYSTEM_ID, SENT_MARKER);
    const lastSent = marker?.date || marker?.data?.date;
    if (lastSent === today) {
      return NextResponse.json({ ok: true, skipped: 'already_sent_today', date: today });
    }

    // Claim the day BEFORE sending so a near-simultaneous n8n call can't also
    // send. A send failure still marks the day (we don't want a retry storm);
    // the summary surfaces per-recipient failures for follow-up.
    await saveUserData(SYSTEM_ID, SENT_MARKER, { date: today, at: new Date().toISOString() });

    const summary = await sendDailyNotifications();
    return NextResponse.json({ ok: true, date: today, ...summary });
  } catch (error) {
    console.error('GET /api/cron/daily-pick error:', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}

export async function GET(request) {
  return run(request);
}

// Allow POST too, so the same guarded path can be triggered manually if needed.
export async function POST(request) {
  return run(request);
}
