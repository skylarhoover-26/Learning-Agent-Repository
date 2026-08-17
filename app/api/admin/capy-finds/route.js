import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getCapyFindCounts, getProfileMetaMap } from '@/lib/supabase-store';
import { FINDABLE_EGG_IDS, EASTER_EGGS } from '@/lib/easter-eggs';

// Who has collected how many capybaras, for the roll-up under the Easter Egg Key.
//
// Reads xp_events straight out of Supabase: a collect IS an XP event, so this is
// a cross-user question answered from the table that already holds the answer —
// no per-learner fetches and no separate store to keep in sync.
export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [capyMap, metaMap] = await Promise.all([
      getCapyFindCounts(),
      getProfileMetaMap().catch(() => null),
    ]);

    if (!capyMap) {
      return NextResponse.json(
        { error: 'Collection data is unavailable right now.', people: [], total: FINDABLE_EGG_IDS.length },
        { status: 503 }
      );
    }

    const meta = metaMap || new Map();
    const nameFor = (email) => {
      const display = meta.get(email)?.display_name;
      if (display) return display;
      const local = String(email).split('@')[0];
      return local
        .split(/[._-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || email;
    };

    // Count only currently-collectable eggs, so a retired or decorative-only egg
    // can't leave someone reading "13 of 12".
    const people = [...capyMap.entries()]
      .map(([email, found]) => {
        const collected = FINDABLE_EGG_IDS.filter((id) => found.has(id));
        return {
          email,
          name: nameFor(email),
          found: collected.length,
          total: FINDABLE_EGG_IDS.length,
          complete: collected.length === FINDABLE_EGG_IDS.length && FINDABLE_EGG_IDS.length > 0,
          // Which ones they still owe — the admin view is allowed to know.
          remaining: FINDABLE_EGG_IDS.filter((id) => !found.has(id)),
        };
      })
      .filter((p) => p.found > 0)
      .sort((a, b) => b.found - a.found || a.name.localeCompare(b.name));

    // Per-egg tally: which capybaras nobody has found is the most useful signal
    // here, because it usually means the placement is unreachable rather than
    // that people are bad at looking.
    const perEgg = FINDABLE_EGG_IDS.map((id) => ({
      id,
      name: EASTER_EGGS.find((e) => e.id === id)?.name || id,
      collectedBy: [...capyMap.values()].filter((set) => set.has(id)).length,
    })).sort((a, b) => a.collectedBy - b.collectedBy);

    return NextResponse.json({
      people,
      perEgg,
      total: FINDABLE_EGG_IDS.length,
      collectors: people.length,
    });
  } catch (error) {
    console.error('GET /api/admin/capy-finds error:', error);
    return NextResponse.json({ error: 'Failed to load collection data' }, { status: 500 });
  }
}
