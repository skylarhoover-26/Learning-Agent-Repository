import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getSlackLessonConfig, setSlackLessonEnabled } from '@/lib/slack-lesson-config';

// Admin toggle for taking lessons inside Slack. Off by default, so the rollout is a
// deliberate act: with it off, the daily DM shows no "Take it here in Slack" button
// and any button left in an older message answers with a pointer to the app.
//
// force-dynamic because this reads a mutable config blob — a cached GET would show
// admins a stale state right after they flipped it.
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  return user?.email && await isAdmin(user.email);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json(await getSlackLessonConfig());
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { enabled } = await request.json();
    const saved = await setSlackLessonEnabled(enabled === true);
    return NextResponse.json(saved);
  } catch (error) {
    console.error('POST /api/admin/slack-lesson error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
