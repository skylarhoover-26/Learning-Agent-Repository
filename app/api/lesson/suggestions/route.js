import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateSuggestedTopics } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';
import { withProjects } from '@/lib/work-projects';

// Without an explicit maxDuration a Vercel function takes the platform default,
// which is far shorter than an LLM call needs — the request is killed mid-flight
// and the audit entry that would have explained it is never written (feedback
// #232 rediscovered this on the lesson path). Every AI route names its own limit.
export const maxDuration = 60;

export async function POST(request) {
  const limited = await enforceRateLimit('lesson/suggestions', 'ai', request);
  if (limited) return limited;

  try {
    const profile = await getAuthenticatedProfile();
    let exclude = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.exclude)) exclude = body.exclude;
    } catch {
      // no body / not JSON — fine, just no exclusions
    }
    // Projects are one of the four signals the suggestions are built from, and
    // they live outside the profile document.
    const suggestions = await generateSuggestedTopics(await withProjects(profile), { exclude });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/lesson/suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
