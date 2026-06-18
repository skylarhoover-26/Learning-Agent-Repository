import { NextResponse } from 'next/server';
import { list, put } from '@vercel/blob';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';

// Admin-only: wipe everyone's XP (and admin grants) back to 0 by emptying each
// user's XP blob. Used to clear out test/demo data for a clean slate.
export async function POST() {
  const admin = await getAuthenticatedUser();
  if (!admin?.email || !(await isAdmin(admin.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { blobs } = await list({ prefix: 'users/' });
    // Empty everyone's XP, badges and lesson history so a clean slate also lets
    // one-time XP (the welcome bonus, first-lesson, etc.) be earned again.
    const progressBlobs = blobs.filter((b) => /\/(lp_xp_|lp_badges_|lp_lessons_).*\.json$/.test(b.pathname));
    let reset = 0;
    for (const b of progressBlobs) {
      await put(b.pathname, JSON.stringify([]), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
      reset += 1;
    }

    // Stamp a reset epoch. Clients compare this to what they've seen and clear
    // their local copy, so the reset takes effect for everyone (and one-time XP
    // like the welcome bonus re-grants).
    await put('config/xp-reset.json', JSON.stringify({ resetAt: Date.now() }), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });

    return NextResponse.json({ ok: true, reset });
  } catch (error) {
    console.error('POST /api/admin/reset-xp error:', error);
    return NextResponse.json({ error: 'Failed to reset XP' }, { status: 500 });
  }
}
