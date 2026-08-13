import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { requireAdmin } from '@/lib/require-admin';
import { clearActivityEvents } from '@/lib/supabase-store';
import { logAuditEntry } from '@/lib/audit-log';

// Admin-only: clear the reporting history (every activity_events row).
//
// Kept apart from the progress resets on purpose. Resetting what people HAVE and
// erasing the record of what they DID are different decisions with different
// timing — a test round might be reset weekly, while the history is cleared once
// before go-live so the first month of real reporting starts from zero.
//
// Scope is Supabase only. The blob audit log is the original record and is left
// alone; this clears what reporting reads.
//
// Irreversible, POST only, no GET handler.
export const dynamic = 'force-dynamic';

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const user = await getAuthenticatedUser();
  try {
    const removed = await clearActivityEvents();

    // Logged AFTER the wipe, so this entry survives it and the clear is itself
    // on the record — "the reporting history just went empty" should never be a
    // mystery.
    logAuditEntry({
      type: 'activity_history_cleared',
      endpoint: '/api/admin/clear-activity',
      user: { email: user?.email || 'unknown', name: user?.name || 'Unknown' },
      model: 'n/a',
      input: {},
      output: { rowsRemoved: removed },
      durationMs: 0,
    }).catch(() => {});

    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    console.error('POST /api/admin/clear-activity error:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear the reporting history.' }, { status: 500 });
  }
}
