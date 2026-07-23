// Public daily notification endpoint, triggered by the n8n schedule workflow.
// Protected by a shared secret ONLY — session auth is not a valid gate here
// because the app runs in demo mode (no Okta) where every caller looks like the
// demo user. The admin "Send now" test uses a separate admin-gated route.

import { NextResponse } from 'next/server';
import { sendDailyNotifications } from '@/lib/daily-notify';

export const maxDuration = 60;

function isAuthorized(request) {
  const expected = process.env.NOTIFY_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get('x-notify-secret');
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  return header === expected || bearer === expected;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await sendDailyNotifications('n8n');
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error('POST /api/notifications/daily error:', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
