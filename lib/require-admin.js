import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';

// Server-side admin guard for route handlers. The UI gates in /admin and
// /curriculum-pipeline are convenience only — a client-side router.replace()
// does nothing for someone calling the API with curl (security review F-07).
//
// Usage:
//   const denied = await requireAdmin();
//   if (denied) return denied;
//
// Returns a 403 Response when the caller isn't an admin, or null when they are.
export async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
