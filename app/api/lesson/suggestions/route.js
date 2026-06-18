import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateSuggestedTopics } from '@/lib/ai';

export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    let exclude = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.exclude)) exclude = body.exclude;
    } catch {
      // no body / not JSON — fine, just no exclusions
    }
    const suggestions = await generateSuggestedTopics(profile, { exclude });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/lesson/suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
