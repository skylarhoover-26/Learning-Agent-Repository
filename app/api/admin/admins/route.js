import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin, getSeedAdminEmails } from '@/lib/admin';
import { getAdminAllowlist, setAdminAllowlist } from '@/lib/admin-store';

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  return !!(user?.email && (await isAdmin(user.email)));
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({
    seed: getSeedAdminEmails(),
    extra: await getAdminAllowlist(),
  });
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { emails } = await request.json();
    const saved = await setAdminAllowlist(emails);
    return NextResponse.json({ extra: saved });
  } catch (error) {
    console.error('POST /api/admin/admins error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
