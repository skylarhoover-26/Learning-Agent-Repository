import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdminEmail } from '@/lib/admin';
import { getNotifyAllowlist, setNotifyAllowlist } from '@/lib/notify-allowlist';

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  return user?.email && isAdminEmail(user.email);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const emails = await getNotifyAllowlist();
  return NextResponse.json({ emails });
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { emails } = await request.json();
    const saved = await setNotifyAllowlist(emails);
    return NextResponse.json({ emails: saved });
  } catch (error) {
    console.error('POST /api/admin/notify-allowlist error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
