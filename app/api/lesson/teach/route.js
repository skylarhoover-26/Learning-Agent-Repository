import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { withProjects } from '@/lib/work-projects';
import { generateTeachStep, generateLessonAnswer } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';

// A single teach step is a smaller call, but cold starts + a deep-dive step
// (~2400 tokens) can still push past 60s, so give it headroom.
export const maxDuration = 120;

// Generates the teaching content for one planned teach step, or answers a
// learner's free-form question (mode: 'answer').
export async function POST(request) {
  const limited = await enforceRateLimit('lesson/teach', 'ai', request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { topic, objectives, tools, mode, format } = body;
    const profile = await getAuthenticatedProfile();
    // Projects live outside the profile document, so attach them here — the
    // generator weights tasks, goals AND projects (lib/learner-signals.js).
    const profileForGen = await withProjects(
      tools ? { ...profile, preferred_tools: tools } : profile,
    );

    if (mode === 'answer') {
      const result = await generateLessonAnswer(topic, profileForGen, {
        objectives: objectives || [],
        question: body.question || '',
        priorContent: body.priorContent || [],
        currentStep: body.currentStep || '',
        recentQa: body.recentQa || [],
      });
      return NextResponse.json(result);
    }

    const result = await generateTeachStep(topic, profileForGen, {
      objectives: objectives || [],
      step: body.step || {},
      priorTitles: body.priorTitles || [],
      priorContent: body.priorContent || [],
      upcoming: body.upcoming || null,
      format,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/teach error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
