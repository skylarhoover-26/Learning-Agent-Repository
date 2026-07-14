import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { PROFILE_CATALOG } from '@/lib/profile-catalog';
import { getProfileVisibility, setProfileVisibility } from '@/lib/profile-visibility';

// Reads MUTABLE per-org config from the blob, so never statically cache it —
// otherwise admin changes only apply on the next deploy. Force dynamic.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET is public to signed-in users: every profile-menu render needs the lists.
// We also return the catalog so the admin page has the structure to render.
export async function GET() {
  const visibility = await getProfileVisibility();
  return NextResponse.json({ catalog: PROFILE_CATALOG, ...visibility });
}

// POST is admin-only: save which profile items are hidden/coming-soon.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { items, hiddenItems } = await request.json();
    const saved = await setProfileVisibility({ items, hiddenItems });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('POST /api/profile-visibility error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
