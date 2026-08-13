import { NextResponse } from 'next/server';
import { readJsonBlob } from '@/lib/blob-json';
import { getAuthenticatedUser } from '@/lib/auth-helpers';

// The latest reset timestamp that applies to the CALLER. Clients compare it to
// what they've already applied (lp_reset_seen) and clear their local progress
// when a newer reset exists.
//
// Two sources, and the answer is whichever is newer:
//   config/xp-reset.json   — a global reset (admin reset everyone)
//   config/user-reset.json — { "<email>": <ms> }, written by admin/reset-user
//
// Resolving the max here rather than client-side keeps the browser logic as one
// number to compare, and means one person's reset can never leak into anyone
// else's response.
//
// Reads mutable blob config, so it must never be cached at build time.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [globalData, userMap] = await Promise.all([
      readJsonBlob('config/xp-reset.json', { fresh: true }).catch(() => null),
      readJsonBlob('config/user-reset.json', { fresh: true }).catch(() => null),
    ]);

    const globalAt = Number(globalData?.resetAt) || 0;

    // Unauthenticated (or a lookup failure) still gets the global stamp, which is
    // what this endpoint always returned. Never throw from here: the provider
    // treats a failed epoch check as "no reset pending" and would carry on with
    // stale local data.
    let userAt = 0;
    try {
      const user = await getAuthenticatedUser();
      const email = user?.email?.toLowerCase();
      if (email && userMap && typeof userMap === 'object') {
        userAt = Number(userMap[email]) || 0;
      }
    } catch { /* fall through to the global stamp */ }

    return NextResponse.json({ resetAt: Math.max(globalAt, userAt) });
  } catch {
    return NextResponse.json({ resetAt: 0 });
  }
}
