import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { ensureDailyPickLesson } from '@/lib/daily-pick-lesson';

// Warm-on-open: the home page fires this (fire-and-forget) when it computes the
// learner's pick, so the lesson is pre-generated + cached before they click it —
// covering the in-app case, early-morning clicks, and weekends when the pre-gen
// cron doesn't run. Generation can take ~30-60s; the client doesn't await the
// result, so a long request here is fine.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile?.email) return NextResponse.json({ ok: false, reason: 'no_profile' });
    const result = await ensureDailyPickLesson(profile);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/daily-pick/warm error:', error);
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 200 });
  }
}
