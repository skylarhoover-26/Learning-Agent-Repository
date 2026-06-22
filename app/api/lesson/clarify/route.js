import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateTopicClarification } from '@/lib/ai';

// LLM call — avoid the short default function timeout killing it mid-generation.
export const maxDuration = 60;

// For a learner-typed topic, decide if it's too vague to teach well. If so,
// returns a clarifying question plus pickable directions (basics + 1-2 specific
// angles); otherwise { vague: false } so the lesson starts immediately.
export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const { topic, context } = await request.json();
    if (!topic) return NextResponse.json({ vague: false });
    const result = await generateTopicClarification(topic, profile, { context });
    return NextResponse.json(result || { vague: false });
  } catch (error) {
    console.error('POST /api/lesson/clarify error:', error);
    // Never block starting a lesson on a clarify hiccup.
    return NextResponse.json({ vague: false });
  }
}
