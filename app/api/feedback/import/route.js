import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { saveFeedback } from '@/lib/feedback-store';
import { getTesterFeedbackRecords } from '@/lib/tester-feedback';

// Writing ~16 blobs sequentially can run past the default budget.
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Admin-only: import tester test-script feedback into the feedback store.
// Idempotent — records use deterministic ids, so re-running overwrites in
// place instead of duplicating.
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const records = getTesterFeedbackRecords();
    for (const record of records) {
      await saveFeedback(record);
    }
    return NextResponse.json({ ok: true, imported: records.length });
  } catch (error) {
    console.error('POST /api/feedback/import error:', error);
    return NextResponse.json({ error: 'Failed to import feedback' }, { status: 500 });
  }
}
