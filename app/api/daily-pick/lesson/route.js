import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { readDailyPickLesson } from '@/lib/daily-pick-lesson';

export const dynamic = 'force-dynamic';

// Returns the pre-generated lesson (plan + first teach step) for the authed
// learner IF it matches the requested topic/format and is from today; otherwise
// { plan: null }. The lesson player calls this before generating, and hydrates
// instantly on a hit. A miss is normal (falls through to on-the-fly generation).
export async function GET(request) {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile?.email) return NextResponse.json({ plan: null });
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const format = searchParams.get('format') || 'standard';
    const cached = await readDailyPickLesson(profile.email, topic, format);
    if (!cached) return NextResponse.json({ plan: null });
    return NextResponse.json({
      plan: cached.plan,
      teach: cached.teach || {},
      toolIds: cached.toolIds || null,
      recommendation: cached.recommendation || null,
    });
  } catch (error) {
    console.error('GET /api/daily-pick/lesson error:', error);
    return NextResponse.json({ plan: null });
  }
}
