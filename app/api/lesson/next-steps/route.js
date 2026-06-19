import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateNextSteps } from '@/lib/ai';

export const maxDuration = 60;

// End-of-lesson safety net: when a learner says the lesson didn't fully answer
// what they came for, return tailored troubleshooting resources + a paste-ready
// prompt to get them unstuck.
export async function POST(request) {
  try {
    const body = await request.json();
    const profile = await getAuthenticatedProfile();
    const result = await generateNextSteps(body.topic || '', profile, {
      objectives: body.objectives || [],
      stillUnclear: body.stillUnclear || '',
      format: body.format || 'standard',
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/next-steps error:', error);
    return NextResponse.json({
      intro: 'Here are a few ways to dig deeper.',
      steps: [{ title: 'Ask your AI tool', detail: 'Describe exactly where you got stuck and ask for a step-by-step walkthrough.' }],
      prompt: 'I just took a lesson but I\'m still stuck on [describe the problem]. Walk me through it step by step and ask me clarifying questions.',
    });
  }
}
