import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateDailyPrompts } from '@/lib/ai';

export const maxDuration = 60;

// Daily, role-personalized prompts for the Prompts page. Client caches per
// content-day (8 AM PT), so this only runs once a day per learner.
export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    let exclude = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.exclude)) exclude = body.exclude;
    } catch {
      // no body — fine
    }
    const prompts = await generateDailyPrompts(profile, { exclude });
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('POST /api/prompts/daily error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate prompts' }, { status: 500 });
  }
}
