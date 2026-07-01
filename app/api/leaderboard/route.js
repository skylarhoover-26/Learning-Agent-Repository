import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { getLeaderboard } from '@/lib/leaderboard';

// Never statically cache this route — it reads a mutable blob snapshot.
export const dynamic = 'force-dynamic';
// A cold/stale read rebuilds the whole roster synchronously, which can take a
// while; give it room so it doesn't time out mid-rebuild.
export const maxDuration = 60;

// Cross-user leaderboard. Any signed-in learner can see it. Served from a cached
// snapshot (rebuilt on read past a short TTL) so it loads fast.
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const data = await getLeaderboard();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
