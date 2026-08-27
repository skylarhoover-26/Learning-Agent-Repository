import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateToolRecommendation } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';

// Without an explicit maxDuration a Vercel function takes the platform default,
// which is far shorter than an LLM call needs — the request is killed mid-flight
// and the audit entry that would have explained it is never written (feedback
// #232 rediscovered this on the lesson path). Every AI route names its own limit.
export const maxDuration = 30;

// Returns the best AI tool for a lesson topic ({ tool, why }), so the lesson can
// suggest the right tool — not just the learner's favorite — and explain why.
export async function POST(request) {
  const limited = await enforceRateLimit('lesson/recommend-tool', 'ai', request);
  if (limited) return limited;

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
