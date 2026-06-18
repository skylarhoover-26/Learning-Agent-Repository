import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonPlan } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';
import { alertAdmins } from '@/lib/admin-alert';

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

    if (error) {
      // The retries inside generateLessonPlan are exhausted — alert admins over
      // Slack so we know it's still happening without waiting on a report.
      // Throttled so a systemic outage can't fan out into an alert storm.
      const who = profile?.display_name || profile?.email || 'a learner';
      await alertAdmins(
        `:warning: *Lesson failed to generate* (after all retries)\n` +
        `• Topic: ${topic}\n• Depth: ${format || 'standard'}\n• Learner: ${who}\n• Error: ${error.message}`,
        { throttleKey: 'lesson_plan_fail', throttleMinutes: 10 }
      ).catch(() => {});
      throw error;
    }
    return NextResponse.json(plan);
  } catch (error) {
    console.error('POST /api/lesson/plan error:', error);
    return NextResponse.json({ error: error.message || 'Failed to plan lesson' }, { status: 500 });
  }
}
