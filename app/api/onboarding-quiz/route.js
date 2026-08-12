import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getQuiz, setQuiz, resetQuiz } from '@/lib/onboarding-quiz-store';
import { QUIZ_DEFAULTS, normalizeQuiz } from '@/lib/onboarding-quiz';
import { SKILL_LABELS, SKILL_DEFINITIONS } from '@/lib/competencies';

// This config lives in mutable blob storage, so the route must never be
// statically cached — a cached GET would keep serving the question set from
// build time and admin edits would appear to do nothing.
export const dynamic = 'force-dynamic';

// GET is public to signed-in users: every learner's assessment needs the
// questions. Also returns the code defaults and competency metadata so the admin
// editor can render labels and offer "reset to defaults" without a second call.
export async function GET() {
  const questions = await getQuiz();
  return NextResponse.json({
    questions,
    defaults: normalizeQuiz(QUIZ_DEFAULTS),
    labels: SKILL_LABELS,
    definitions: SKILL_DEFINITIONS,
  });
}

// POST is admin-only: save the authored question set, or reset to defaults.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const questions = body?.reset ? await resetQuiz() : await setQuiz(body?.questions);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error('POST /api/onboarding-quiz error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save' }, { status: 500 });
  }
}
