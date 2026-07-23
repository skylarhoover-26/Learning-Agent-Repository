// Admin-only read of the daily-pick send history (the "pulse check"). Returns
// the rolling log newest-first so admins can confirm each weekday send fired.

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getDailySendLog } from '@/lib/daily-notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const entries = await getDailySendLog();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/admin/notifications/log error:', error);
    return NextResponse.json({ error: 'Load failed' }, { status: 500 });
  }
}
