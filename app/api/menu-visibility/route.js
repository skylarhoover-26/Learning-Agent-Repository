import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { MENU_CATALOG } from '@/lib/menu-catalog';
import { getMenuVisibility, setMenuVisibility } from '@/lib/menu-visibility';

// GET is public to signed-in users: every menu render needs the disabled lists.
// We also return the catalog so the admin page has the structure to render.
export async function GET() {
  const visibility = await getMenuVisibility();
  return NextResponse.json({ catalog: MENU_CATALOG, ...visibility });
}

// POST is admin-only: save which sections/items are hidden from non-admins.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { sections, items, hiddenSections, hiddenItems } = await request.json();
    const saved = await setMenuVisibility({ sections, items, hiddenSections, hiddenItems });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('POST /api/menu-visibility error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
