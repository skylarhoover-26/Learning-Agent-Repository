import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdminEmail } from '@/lib/admin';
import { getAuditEntries, getAuditDates, getAuditStats } from '@/lib/audit-log';

export async function GET(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'entries';
    const date = searchParams.get('date');
    const type = searchParams.get('type');
    const userEmail = searchParams.get('user');
    const limit = searchParams.get('limit');

    if (action === 'dates') {
      const dates = await getAuditDates();
      return NextResponse.json({ dates });
    }

    if (action === 'stats') {
      const stats = await getAuditStats(date);
      return NextResponse.json({ stats });
    }

    const entries = await getAuditEntries({
      date,
      type,
      userEmail,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/audit-log error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
