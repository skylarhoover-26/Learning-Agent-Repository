import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { migrateBlobToSupabase } from '@/lib/feedback-store';
import { supabaseConfigured } from '@/lib/supabase';

// A large backlog means one upsert per record — give it room.
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Admin-only, manually triggered ONCE: copy every existing blob feedback record
// into the Supabase `feedback` table. Must run in prod, where the blob token
// points at the real store. Idempotent (upsert by id) — safe to re-run.
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (!supabaseConfigured) {
    return NextResponse.json(
      { error: 'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' },
      { status: 503 }
    );
  }
  try {
    const result = await migrateBlobToSupabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/feedback/migrate-to-supabase error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
