import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { reclassifyAiPriorities } from '@/lib/feedback-store';

// Re-triage can take a while — one Haiku call per non-Praise, non-manually-set record.
export const maxDuration = 300;

// Admin-only, manually triggered: re-run AI priority classification on the
// backlog after a triage-prompt fix, e.g. when Critical was being over-assigned.
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { updated } = await reclassifyAiPriorities();
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error('POST /api/feedback/retriage error:', error);
    return NextResponse.json({ error: 'Failed to re-triage feedback' }, { status: 500 });
  }
}
