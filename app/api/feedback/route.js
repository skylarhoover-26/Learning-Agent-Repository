import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { saveFeedback, listFeedback, uploadFeedbackScreenshot, patchFeedback, backfillPriorities, appendFeedbackNote, appendFeedbackScreenshot } from '@/lib/feedback-store';
import { PRIORITY_LEVELS } from '@/lib/feedback-priority';
import { classifyFeedback } from '@/lib/feedback-triage';
import { notifyCriticalFeedback } from '@/lib/slack-notify';

// Screenshot uploads and the on-load priority backfill can take a moment.
export const maxDuration = 60;
// GET reads mutable blob data — never let Next statically cache it.
export const dynamic = 'force-dynamic';

const CATEGORIES = ['Idea', 'Bug', 'Confusing', 'Praise', 'Other'];
const STATUSES = ['open', 'done'];
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
    };
    // Priority comes from the AI reading actual severity, not the category the
    // user picked — a Bug can be Low, an Idea can be Critical. Praise skips
    // triage entirely (positive signal, not a to-do).
    if (category !== 'Praise') {
      const classification = await classifyFeedback(record);
      if (classification) {
        record.priority = classification.priority;
        record.aiReason = classification.reason;
        record.aiBugVerdict = classification.bugVerdict;
        record.priorityIsAiAssigned = true;
      }
    }
    await saveFeedback(record);
    if (record.priority === 'Critical') {
      await notifyCriticalFeedback(record).catch((error) => console.error('notifyCriticalFeedback error:', error));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Only admins can read the collected feedback. Loading also backfills an
// AI-assigned priority onto any record still missing one, so nothing shows up
// unrated. Falls back to a plain read if the backfill can't complete.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { records } = await backfillPriorities();
    return NextResponse.json({ feedback: records });
  } catch (error) {
    console.error('GET /api/feedback backfill failed, returning plain list:', error);
    const feedback = await listFeedback();
    return NextResponse.json({ feedback });
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
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await patchFeedback(id, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }
    // Admin manually escalated it to Critical — alert same as an AI-flagged one.
    if (patch.priority === 'Critical') {
      await notifyCriticalFeedback(updated).catch((error) => console.error('notifyCriticalFeedback error:', error));
    }
    return NextResponse.json({ ok: true, feedback: updated });
  } catch (error) {
    console.error('PATCH /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
