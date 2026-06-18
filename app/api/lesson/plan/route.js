import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonPlan } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

// Plan generation can run long (large model output) and now retries internally,
// so give the function room rather than letting it be cut short mid-generation.
export const maxDuration = 120;

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

    if (error) throw error;
    return NextResponse.json(plan);
  } catch (error) {
    console.error('POST /api/lesson/plan error:', error);
    return NextResponse.json({ error: error.message || 'Failed to plan lesson' }, { status: 500 });
  }
}
