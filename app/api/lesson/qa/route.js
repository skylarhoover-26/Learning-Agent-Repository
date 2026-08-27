import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonQA } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';
import { enforceRateLimit } from '@/lib/rate-limit';

// Without an explicit maxDuration a Vercel function takes the platform default,
// which is far shorter than an LLM call needs — the request is killed mid-flight
// and the audit entry that would have explained it is never written (feedback
// #232 rediscovered this on the lesson path). Every AI route names its own limit.
export const maxDuration = 60;

// Hidden self-QA: runs a quality review on a generated lesson plan and logs the
// verdict (with the learner + tool) to the audit log so admins can review it.
// Learners never see the result.
export async function POST(request) {
  const limited = await enforceRateLimit('lesson/qa', 'ai', request);
  if (limited) return limited;

  try {
    const { plan, topic, format, tool } = await request.json();
    const profile = await getAuthenticatedProfile();
    if (!plan) return NextResponse.json({ ok: false });

    const qa = await generateLessonQA(plan, topic, format);
    if (!qa) return NextResponse.json({ ok: false });

    await logAuditEntry({
      type: 'lesson_qa',
      endpoint: '/api/lesson/qa',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: 'qa',
      // Store the full plan so admins can review the exact lesson a learner got
      // (objectives + every step incl. activity content) and apply updates.
      input: {
        topic, format, tool,
        objectives: (plan.objectives || []).length,
        steps: (plan.steps || []).length,
        plan: { objectives: plan.objectives || [], steps: plan.steps || [] },
      },
      output: { score: qa.score, verdict: qa.verdict, issues: qa.issues },
      durationMs: 0,
      error: qa.issues?.length ? `${qa.issues.length} issue(s)` : null,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/lesson/qa error:', error);
    return NextResponse.json({ ok: false });
  }
}
