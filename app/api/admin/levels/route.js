import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/require-admin';
import { getLearnerLevels, getDeclaredTiers, getRecentActivity } from '@/lib/supabase-store';
import { FULL_LADDER } from '@/lib/adaptive-level';

// Declared vs. earned level for everyone, read straight out of Supabase.
//
// Reads the relational tables rather than the blob store on purpose: this is a
// cross-user question ("who has been moved, and which way"), and answering it
// from blob would mean one fetch per learner every time the page loads.
export const dynamic = 'force-dynamic';

function rank(tier) {
  const i = FULL_LADDER.indexOf(tier);
  return i < 0 ? null : i;
}

// Which way someone has moved from what they picked at onboarding.
function drift(declared, earned) {
  const a = rank(declared);
  const b = rank(earned);
  if (a === null || b === null || a === b) return 'none';
  return b > a ? 'up' : 'down';
}

export async function GET(request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  // Detail view: one learner's recent graded activity, so a level change can be
  // explained by what actually happened rather than taken on faith.
  if (email) {
    const activity = await getRecentActivity(email);
    return NextResponse.json({ available: activity !== null, activity: activity || [] });
  }

  const [levels, profiles] = await Promise.all([getLearnerLevels(), getDeclaredTiers()]);

  // Supabase off or unreachable. Say so plainly instead of rendering an empty
  // table that reads as "nobody has been levelled".
  if (levels === null || profiles === null) {
    return NextResponse.json({ available: false, rows: [] });
  }

  const rows = profiles
    .filter((p) => p.email)
    .map((p) => {
      const level = levels.get(String(p.email).toLowerCase()) || null;
      const declared = p.tier || null;
      const earned = level?.earned_tier || declared;
      return {
        email: p.email,
        name: p.display_name || p.name || p.email,
        department: p.department || null,
        declared,
        earned,
        drift: drift(declared, earned),
        score: level?.score ?? null,
        band: level?.band ?? null,
        samples: level?.samples ?? 0,
        lastChange: level?.last_change ?? null,
        updatedAt: level?.updated_at ?? null,
      };
    })
    // Anyone who has actually moved comes first — that's the reason to open this
    // page. Then people with activity, then everyone still sitting on defaults.
    .sort((a, b) => {
      const moved = (r) => (r.drift === 'none' ? 1 : 0);
      if (moved(a) !== moved(b)) return moved(a) - moved(b);
      if ((b.samples || 0) !== (a.samples || 0)) return (b.samples || 0) - (a.samples || 0);
      return a.name.localeCompare(b.name);
    });

  return NextResponse.json({
    available: true,
    rows,
    summary: {
      total: rows.length,
      moved: rows.filter((r) => r.drift !== 'none').length,
      down: rows.filter((r) => r.drift === 'down').length,
      up: rows.filter((r) => r.drift === 'up').length,
      noActivity: rows.filter((r) => !r.samples).length,
    },
  });
}
