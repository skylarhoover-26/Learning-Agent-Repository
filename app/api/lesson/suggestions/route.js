import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateSuggestedTopics } from '@/lib/ai';

export async function POST() {
  try {
    const profile = await getAuthenticatedProfile();
    const suggestions = await generateSuggestedTopics(profile);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/lesson/suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
