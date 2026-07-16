import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { saveFeedback, listFeedback, uploadFeedbackScreenshot } from '@/lib/feedback-store';

// Screenshot uploads can take a moment; give the route headroom past the default.
export const maxDuration = 30;
// GET reads mutable blob data — never let Next statically cache it.
export const dynamic = 'force-dynamic';

const CATEGORIES = ['Idea', 'Bug', 'Confusing', 'Praise', 'Other'];
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
    await saveFeedback({
      id,
      at: new Date().toISOString(),
      email: user.email,
      name: user.name || user.email,
      category,
      text: text.slice(0, 5000),
      page: (body.page || '').toString().slice(0, 300),
      screenshotUrls,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Only admins can read the collected feedback.
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const feedback = await listFeedback();
  return NextResponse.json({ feedback });
}
