import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { reconcileImportedFeedback, backfillPriorities } from '@/lib/feedback-store';
import { getTesterFeedbackRecords } from '@/lib/tester-feedback';

// Writing/deleting/backfilling many blobs sequentially can run past the default.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Admin-only: sync tester test-script feedback into the feedback store, then
// backfill category-based priorities on any record still missing one.
// Idempotent — records use deterministic ids, so re-running overwrites in
// place; any previously-imported record no longer in the files is removed.
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const records = getTesterFeedbackRecords();
    const { imported, removed } = await reconcileImportedFeedback(records);
    const { updated: prioritized } = await backfillPriorities();
    return NextResponse.json({ ok: true, imported, removed, prioritized });
  } catch (error) {
    console.error('POST /api/feedback/import error:', error);
    return NextResponse.json({ error: 'Failed to import feedback' }, { status: 500 });
  }
}
