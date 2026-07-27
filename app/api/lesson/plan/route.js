import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonPlan } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Plan generation can run long — a Project Quest plan is up to ~8000 output
// tokens on Sonnet, which alone can take well over 2 minutes, plus internal
// grounding/retries. 120s was cutting quests off mid-generation (the client
// then saw an aborted request), so give the function the full budget.
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
