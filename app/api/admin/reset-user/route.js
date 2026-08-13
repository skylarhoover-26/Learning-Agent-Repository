import { NextResponse } from 'next/server';
import { readJsonBlob, writeJsonBlob, listJsonBlobs, delJsonBlob } from '@/lib/blob-json';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { mirrorResetUserProgress, mirrorWipeUser } from '@/lib/supabase-store';

// Admin-only: reset ONE person, without touching anyone else.
//
// The two existing reset routes are both all-or-nothing (reset-xp empties
// everyone's progress, reset-all wipes every account), and the Danger Zone on the
// profile page only ever acted on the signed-in user, because
// DELETE /api/user-data reads the email off the session. So there was no way to
// reset a single learner at all — this is that missing piece.
//
// mode:
//   'progress' — empty XP, badges and lesson history. Role, tasks and profile
//                stay, so they land back on the home screen at level 1 rather
//                than in onboarding. One-time XP (welcome bonus, first lesson)
//                becomes earnable again.
//   'full'     — delete every blob under users/<email>/, so their next visit
//                starts at onboarding.
//
// THE EPOCH IS THE LOAD-BEARING PART. Progress lives local-first in the
// learner's own browser and re-hydrates from there, so a server-side wipe alone
// gets silently undone the next time they open the app. The global routes solve
// that by stamping config/xp-reset.json, which every client compares against
// lp_reset_seen. That stamp is global, so reusing it here would reset the whole
// company. This writes a per-user map instead, and /api/xp-reset-epoch resolves
// the newer of the two for whoever is asking.
export const dynamic = 'force-dynamic';

const USER_RESET_KEY = 'config/user-reset.json';

export async function POST(request) {
  const admin = await getAuthenticatedUser();
  if (!admin?.email || !(await isAdmin(admin.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const mode = body.mode === 'full' ? 'full' : 'progress';
    if (!email) {
      return NextResponse.json({ error: 'An email is required.' }, { status: 400 });
    }

    // Guard against a stray path segment reaching the blob prefix below.
    if (email.includes('/') || email.includes('..')) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
    }

    const prefix = `users/${email}/`;
    const { blobs } = await listJsonBlobs({ prefix });
    if (!blobs.length) {
      return NextResponse.json({ error: 'No stored data found for that person.' }, { status: 404 });
    }

    let touched = 0;

    // Supabase is not a mirror of the blob here, it is the source the leaderboard
    // (and therefore the People list) actually reads. Both stores must be cleared
    // or the wipe reads as undone: emptying the blob alone left every xp_events
    // row in place and the person's XP came straight back on refresh.
    //
    // These are dedicated delete functions, NOT mirrorSave(..., []). An empty save
    // is a no-op for an append-only ledger, which is exactly how that bug happened.
    if (mode === 'full') {
      for (const b of blobs) {
        await delJsonBlob(b.pathname);
        touched += 1;
      }
      await mirrorWipeUser(email);
    } else {
      // Progress only: empty the three ledgers rather than deleting them, which
      // is what reset-xp does for everyone. Emptying keeps the blob present so a
      // later read gets [] instead of a miss.
      const ledgers = blobs.filter((b) => /\/(lp_xp_|lp_badges_|lp_lessons_).*\.json$/.test(b.pathname));
      for (const b of ledgers) {
        await writeJsonBlob(b.pathname, [], { cacheControlMaxAge: 0 });
        touched += 1;
      }
      await mirrorResetUserProgress(email);
    }

    // Stamp this person's reset epoch so their browser clears its local copy on
    // next load. Read-modify-write: the map holds everyone ever reset this way.
    const existing = (await readJsonBlob(USER_RESET_KEY, { fresh: true })) || {};
    const map = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? existing : {};
    map[email] = Date.now();
    await writeJsonBlob(USER_RESET_KEY, map, { cacheControlMaxAge: 0 });

    // Drop the cached leaderboard so it rebuilds without this person's old total.
    try {
      const { blobs: lbBlobs } = await listJsonBlobs({ prefix: 'leaderboard/' });
      for (const b of lbBlobs) await delJsonBlob(b.pathname);
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, email, mode, touched });
  } catch (error) {
    console.error('POST /api/admin/reset-user error:', error);
    return NextResponse.json({ error: 'Failed to reset that person.' }, { status: 500 });
  }
}
