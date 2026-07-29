import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonPlan } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Plan generation can run long — see PLAN_TOKENS in lib/ai.js for the per-format
// output ceiling, plus internal grounding/retries. Keep this at 300s and keep the
// caller's abort budget UNDER it (the player uses 280s): if the client gives up
// first, a plan the server would have returned successfully surfaces to the
// learner as a failure instead. generateLessonPlan caps its retries to fit here.
export const maxDuration = 300;

export async function POST(request) {
  try {
    const { topic, format, tools } = await request.json();
    const profile = await getAuthenticatedProfile();
    const profileForGen = tools ? { ...profile, preferred_tools: tools } : profile;

    const start = Date.now();
    let plan;
    let error;
    try {
      plan = await generateLessonPlan(topic, profileForGen, { format });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_plan',
      endpoint: '/api/lesson/plan',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic, format },
      output: error ? null : { objectives: plan?.objectives?.length || 0, steps: plan?.steps?.length || 0 },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    // Failures (after all retries) are recorded in the audit log above for admin
    // review; no separate alert needed.
    if (error) throw error;
    return NextResponse.json(plan);
  } catch (error) {
    console.error('POST /api/lesson/plan error:', error);
    return NextResponse.json({ error: error.message || 'Failed to plan lesson' }, { status: 500 });
  }
}
