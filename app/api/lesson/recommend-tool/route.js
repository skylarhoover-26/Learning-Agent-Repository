import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateToolRecommendation } from '@/lib/ai';

// Returns the best AI tool for a lesson topic ({ tool, why }), so the lesson can
// suggest the right tool — not just the learner's favorite — and explain why.
export async function POST(request) {
  try {
    await getAuthenticatedProfile();
    const { topic, preferredTool } = await request.json();
    if (!topic) return NextResponse.json({});
    const rec = await generateToolRecommendation(topic, { preferredTool });
    return NextResponse.json(rec || {});
  } catch (error) {
    console.error('POST /api/lesson/recommend-tool error:', error);
    return NextResponse.json({});
  }
}
