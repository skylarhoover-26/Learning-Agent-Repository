// Admin-only read of the Slack conversation log. Same auth posture as the rest
// of /api/admin. Returns newest-first messages, grouped client-side by learner.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { listSlackConversations } from '@/lib/slack-conversation-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const messages = await listSlackConversations({ limit: 500 });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET /api/admin/conversations error:', error);
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
