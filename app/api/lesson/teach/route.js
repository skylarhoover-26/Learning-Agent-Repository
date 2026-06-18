import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateTeachStep, generateLessonAnswer } from '@/lib/ai';

// Generates the teaching content for one planned teach step, or answers a
// learner's free-form question (mode: 'answer').
export async function POST(request) {
  try {
    const body = await request.json();
    const { topic, objectives, tools, mode } = body;
    const profile = await getAuthenticatedProfile();
    const profileForGen = tools ? { ...profile, preferred_tools: tools } : profile;

    if (mode === 'answer') {
      const result = await generateLessonAnswer(topic, profileForGen, {
        objectives: objectives || [],
        question: body.question || '',
      });
      return NextResponse.json(result);
    }

    const result = await generateTeachStep(topic, profileForGen, {
      objectives: objectives || [],
      step: body.step || {},
      priorTitles: body.priorTitles || [],
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/teach error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
