import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateBuildReview } from '@/lib/ai';

export const maxDuration = 60;

// Constructive, non-blocking feedback on a piece the learner built during a
// Project Quest build step. Never gates progress — on any failure the client
// still keeps the learner's work.
export async function POST(request) {
  try {
    const body = await request.json();
    const profile = await getAuthenticatedProfile();
    const result = await generateBuildReview(profile, {
      topic: body.topic || '',
      brief: body.brief || '',
      deliverableName: body.deliverableName || '',
      reviewFocus: body.reviewFocus || '',
      objective: body.objective || '',
      content: body.content || '',
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/build-review error:', error);
    return NextResponse.json({ feedback: 'Saved to your project — keep going!', suggestions: [], looksGood: true });
  }
}
