import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { withProjects } from '@/lib/work-projects';
import { generateLessonPlan } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';
import { enforceRateLimit } from '@/lib/rate-limit';

// Plan generation can run long — see PLAN_TOKENS in lib/ai.js for the per-format
// output ceiling, plus internal grounding/retries. Keep this at 300s and keep the
// caller's abort budget UNDER it (the player uses 280s): if the client gives up
// first, a plan the server would have returned successfully surfaces to the
// learner as a failure instead. generateLessonPlan caps its retries to fit here.
export const maxDuration = 300;

export async function POST(request) {
  const limited = await enforceRateLimit('lesson/plan', 'ai', request);
  if (limited) return limited;

  try {
    // `model` is the model already chosen for this topic by /recommend-tool and
    // shown in the lesson's on-screen hint. Passing it through means the lesson
    // prose names the SAME model the banner does instead of picking its own.
    const { topic, format, tools, model } = await request.json();
    const profile = await getAuthenticatedProfile();
    // Projects live outside the profile document, so attach them here — the
    // generator weights tasks, goals AND projects (lib/learner-signals.js).
    const profileForGen = await withProjects(
      tools ? { ...profile, preferred_tools: tools } : profile,
    );

    const start = Date.now();
    let plan;
    let error;
    try {
      plan = await generateLessonPlan(topic, profileForGen, { format, recommendedModel: model });
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
      // Prefer the diagnostic generateLessonPlan attaches — `message` is the
      // friendly text shown to the learner and names no mechanism (#181).
      error: error?.diagnostic || error?.message || null,
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
