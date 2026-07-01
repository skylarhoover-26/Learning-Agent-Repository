import { NextResponse } from 'next/server';
import { list, del, put } from '@vercel/blob';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { mirrorWipeAll } from '@/lib/supabase-store';

// Admin-only: FULL fresh start. Permanently deletes every per-user blob (XP,
// badges, lessons, profile, goals, games, everything) so all users re-onboard
// from level 1 on next login. Preserves users/__system__/ (admin + notify
// allowlists) so admin access survives. Also wipes the Supabase mirror and
// bumps the reset epoch so returning browsers clear their local cache.
//
// Irreversible. There is intentionally no GET handler — this only runs on POST
// from an authenticated admin.
export const dynamic = 'force-dynamic';

export async function POST() {
  const admin = await getAuthenticatedUser();
  if (!admin?.email || !(await isAdmin(admin.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { blobs } = await list({ prefix: 'users/' });
    // Delete every per-user blob, but NOT the system allowlists.
    const userBlobs = blobs.filter((b) => !b.pathname.startsWith('users/__system__/'));
    let deleted = 0;
    for (const b of userBlobs) {
      await del(b.url);
      deleted += 1;
    }

    // Wipe the Supabase mirror to match.
    await mirrorWipeAll();

    // Bump the reset epoch so returning clients clear their local cache.
    await put('config/xp-reset.json', JSON.stringify({ resetAt: Date.now() }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });

    return NextResponse.json({ ok: true, blobsDeleted: deleted, preserved: 'users/__system__/*' });
  } catch (error) {
    console.error('POST /api/admin/reset-all error:', error);
    return NextResponse.json({ error: 'Failed to reset all data' }, { status: 500 });
  }
}
