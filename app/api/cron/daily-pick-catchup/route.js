// Safety net for the daily-pick DM: a second weekday cron, an hour after the first.
//
// Three Mondays in a row (Jul 27, Aug 3, Aug 10 2026) produced no DM and no trace.
// Nothing in the app can skip a day it hasn't claimed, and those sends were small
// enough that a timeout was implausible, so the likeliest explanation is that the
// scheduled invocation never reached us at all. Vercel cron delivery is best-effort.
//
// Rather than depend on knowing the cause, this makes a missed run self-healing: it
// shares the same claim-the-day guard, so if the 9:30 send happened it no-ops, and if
// it didn't, the nudge still goes out an hour later instead of the day being lost.
//
// It is NOT a retry of a FAILED send. The day is claimed before delivery starts, so a
// run that fired and then broke mid-way stays claimed and this will skip it — that's
// deliberate, because re-running a partial send would DM some people twice.

import { NextResponse } from 'next/server';
import { claimDayAndSend } from '@/lib/daily-send-guard';
import { contentDayKey } from '@/lib/content-day';

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
    // trigger 'catchup' so the admin "Recent sends" row says so — a catch-up row is a
    // signal the primary cron missed, which is worth seeing rather than smoothing over.
    return NextResponse.json(await claimDayAndSend('catchup'));
  } catch (error) {
    console.error('GET /api/cron/daily-pick-catchup error:', error);
    return NextResponse.json({ error: 'Send failed', date: contentDayKey() }, { status: 500 });
  }
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
