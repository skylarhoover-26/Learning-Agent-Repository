// Admin "Send now" test route. Gated like the other admin endpoints (same
// posture as the rest of /api/admin). Reuses the shared daily send logic.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { sendDailyNotifications } from '@/lib/daily-notify';

// 300, not 60: each recipient now resolves their pick AND reads their XP /
// lesson ledgers for the streak line, so per-person work grew. Sends stay
// sequential for Slack's rate limits, so headroom scales with the allowlist.
export const maxDuration = 300;

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const summary = await sendDailyNotifications('manual');
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error('POST /api/admin/notifications/send error:', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
