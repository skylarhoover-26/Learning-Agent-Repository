import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { resolveDailyPick } from '@/lib/daily-pick-server';

// Reads mutable per-user data every call — never cache at the framework level.
export const dynamic = 'force-dynamic';

// Today's Pick, computed server-side from the learner's Supabase-backed data via
// the shared resolver, cached per content-day. See lib/daily-pick-server.js.
export async function GET() {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile?.email) {
      return NextResponse.json({ pick: null, reason: 'no_profile' });
    }
    const { pick, date, cached } = await resolveDailyPick(profile);
    return NextResponse.json({ pick, date, cached });
  } catch (error) {
    console.error('GET /api/daily-pick error:', error);
    return NextResponse.json({ pick: null, reason: 'error' }, { status: 200 });
  }
}
