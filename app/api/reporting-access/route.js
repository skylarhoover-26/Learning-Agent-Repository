import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { requireAdmin } from '@/lib/require-admin';
import { getReportingViewers, setReportingViewers, canViewReporting } from '@/lib/reporting-access';
import { logAuditEntry } from '@/lib/audit-log';

// Mutable config in blob storage — never statically cache it, or a removed
// viewer would keep appearing on the list after being removed.
export const dynamic = 'force-dynamic';

// GET: admins get the full list to manage. Everyone else gets only their own
// answer, so the reporting page can decide whether to show itself without
// handing out a roster of who else has access.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const denied = await requireAdmin();
  if (denied) return NextResponse.json({ canView: await canViewReporting(user.email) });

  return NextResponse.json({
    canView: true,
    isAdmin: true,
    emails: await getReportingViewers(),
  });
}

// POST is admin-only: replace the viewer list.
export async function POST(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const user = await getAuthenticatedUser();
  try {
    const body = await request.json();
    const before = await getReportingViewers();
    const emails = await setReportingViewers(body?.emails);

    // Granting someone sight of everyone's performance data is worth a record.
    logAuditEntry({
      type: 'reporting_access_change',
      endpoint: '/api/reporting-access',
      user: { email: user?.email || 'unknown', name: user?.name || 'Unknown' },
      model: 'n/a',
      input: { before },
      output: {
        after: emails,
        added: emails.filter((e) => !before.includes(e)),
        removed: before.filter((e) => !emails.includes(e)),
      },
      durationMs: 0,
    }).catch(() => {});

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('POST /api/reporting-access error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
  }
}
