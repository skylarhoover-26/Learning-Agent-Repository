import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { saveFeedback, listFeedback, uploadFeedbackScreenshot, patchFeedback, appendFeedbackNote, appendFeedbackScreenshot, appendFeedbackRecording, isBlobUrl } from '@/lib/feedback-store';
import { PRIORITY_LEVELS, PAGING_PRIORITIES, WORK_STATUSES } from '@/lib/feedback-priority';
import { FEATURE_AREAS } from '@/lib/feedback-features';
import { notifyCriticalFeedback } from '@/lib/slack-notify';

// Screenshot uploads can take a moment.
export const maxDuration = 60;
// GET reads mutable blob data — never let Next statically cache it.
export const dynamic = 'force-dynamic';

const CATEGORIES = ['Idea', 'Bug', 'Confusing', 'Praise', 'Other'];
const STATUSES = ['open', 'done', 'skipped'];
const MAX_SHOTS = 4;

// Any signed-in learner can submit feedback.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const text = (body.text || '').toString().trim();
    if (!text) {
      return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });
    }
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    const shots = Array.isArray(body.screenshots) ? body.screenshots.slice(0, MAX_SHOTS) : [];

    const screenshotUrls = [];
    for (const dataUrl of shots) {
      const url = await uploadFeedbackScreenshot(dataUrl);
      if (url) screenshotUrls.push(url);
    }

    // Screen recordings are uploaded directly browser→Blob (see
    // /api/feedback/upload), so they arrive here as already-hosted URLs — keep
    // only the ones that actually point at our Blob store.
    const recordingUrls = Array.isArray(body.recordings)
      ? body.recordings.filter(isBlobUrl).slice(0, MAX_SHOTS)
      : [];

    const id = `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const record = {
      id,
      at: new Date().toISOString(),
      email: user.email,
      name: user.name || user.email,
      category,
      text: text.slice(0, 5000),
      page: (body.page || '').toString().slice(0, 300),
      screenshotUrls,
      recordingUrls,
      // Default workflow status so every new card starts at "Not Started"
      // instead of a blank status; it flows into the Not Started tab once triaged.
      workStatus: 'Not Started',
    };
    // No automatic triage: feedback arrives un-sorted (no priority/feature) and
    // waits in the admin "New" tab until an admin sorts it by assigning a
    // priority. This keeps categorization a deliberate human step.
    await saveFeedback(record);
    // No priority is set on submit, so nothing pages here — admins escalate
    // manually via PATCH, which fires the critical alert when warranted.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Only admins can read the collected feedback. Un-rated records are returned
// as-is (no auto-backfill) so they surface in the "New" tab for manual sorting.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const feedback = await listFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('GET /api/feedback failed:', error);
    return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 });
  }
}

// Only admins can triage feedback (mark done / reopen, set priority).
export async function PATCH(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const id = (body.id || '').toString();
    if (!id) {
      return NextResponse.json({ error: 'Feedback id is required' }, { status: 400 });
    }

    // Notes and post-hoc screenshots are append-only threads, not overwrite
    // patches, so they're handled separately from the status/priority merge below.
    if (typeof body.note === 'string' && body.note.trim()) {
      const note = { text: body.note.trim().slice(0, 2000), by: user.name || user.email, at: new Date().toISOString() };
      const updated = await appendFeedbackNote(id, note);
      if (!updated) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      return NextResponse.json({ ok: true, feedback: updated });
    }
    if (typeof body.screenshot === 'string' && body.screenshot) {
      const url = await uploadFeedbackScreenshot(body.screenshot);
      if (!url) return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 400 });
      const updated = await appendFeedbackScreenshot(id, url);
      if (!updated) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      return NextResponse.json({ ok: true, feedback: updated });
    }
    // A screen recording, already uploaded browser→Blob — store its URL only if
    // it points at our Blob store.
    if (typeof body.recording === 'string' && body.recording) {
      if (!isBlobUrl(body.recording)) {
        return NextResponse.json({ error: 'Invalid recording URL' }, { status: 400 });
      }
      const updated = await appendFeedbackRecording(id, body.recording);
      if (!updated) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      return NextResponse.json({ ok: true, feedback: updated });
    }

    const patch = {};
    if ('status' in body) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      patch.status = body.status;
      // Stamp who resolved it (accountability); clear the stamp on reopen.
      if (body.status === 'done') {
        patch.doneBy = user.name || user.email;
        patch.doneAt = new Date().toISOString();
      } else {
        patch.doneBy = null;
        patch.doneAt = null;
      }
    }
    if ('priority' in body) {
      // null clears the priority; otherwise it must be a known level.
      if (body.priority !== null && !PRIORITY_LEVELS.includes(body.priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
      }
      patch.priority = body.priority;
      // A manual override is authoritative going forward — never let a future
      // AI re-triage pass touch it again.
      patch.priorityIsAiAssigned = false;
    }
    if ('feature' in body) {
      // null clears the feature tag; otherwise it must be a known area.
      if (body.feature !== null && !FEATURE_AREAS.includes(body.feature)) {
        return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
      }
      patch.feature = body.feature;
      // Same as priority: a manual tag is authoritative and won't be re-triaged.
      patch.featureIsAiAssigned = false;
    }
    if ('workStatus' in body) {
      // null clears it; otherwise it must be one of the known workflow statuses.
      if (body.workStatus !== null && !WORK_STATUSES.includes(body.workStatus)) {
        return NextResponse.json({ error: 'Invalid work status' }, { status: 400 });
      }
      patch.workStatus = body.workStatus;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await patchFeedback(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }
    // Admin manually escalated it to a paging level — alert same as AI-flagged.
    if (PAGING_PRIORITIES.includes(patch.priority)) {
      await notifyCriticalFeedback(updated).catch((error) => console.error('notifyCriticalFeedback error:', error));
    }
    return NextResponse.json({ ok: true, feedback: updated });
  } catch (error) {
    console.error('PATCH /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
