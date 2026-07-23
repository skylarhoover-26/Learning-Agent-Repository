import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { generateTeachStep } from '@/lib/ai';

// Admin tool: given a stored lesson plan, reconstruct the teaching text for each
// teach step so an admin can read the full lesson exactly as a learner works
// through it. Activities live in the plan already; only the teach narrative is
// generated on demand (learners get it lazily, so it isn't stored).
export async function POST(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || !(await isAdmin(user.email))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { plan, topic, tier = 'beginner', format } = await request.json();
    if (!plan || !Array.isArray(plan.steps)) {
      return NextResponse.json({ error: 'Missing plan' }, { status: 400 });
    }

    const objectives = plan.objectives || [];
    const profile = { display_name: 'Preview Learner', department: 'General', tier, top_tasks: [], goal: '' };

    // Generate sequentially so each step knows the prior titles (mirrors how the
    // learner experiences it — "don't repeat what's already covered").
    const teach = {};
    const priorTitles = [];
    for (const step of plan.steps) {
      if (step.kind !== 'teach') continue;
      try {
        const content = await generateTeachStep(topic, profile, { objectives, step, priorTitles, format });
        teach[step.id] = { message: content.message, keyPoints: content.keyPoints || [] };
      } catch {
        teach[step.id] = { message: '', keyPoints: [], error: true };
      }
      priorTitles.push(step.title || '');
    }

    return NextResponse.json({ teach });
  } catch (error) {
    console.error('POST /api/admin/lesson-content error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load content' }, { status: 500 });
  }
}
