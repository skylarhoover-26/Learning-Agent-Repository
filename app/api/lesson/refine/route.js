import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateTopicRefinement } from '@/lib/ai';

// Drives the "this isn't what I was looking for" chat: given the original topic
// and the conversation so far, either asks one more question or returns a
// sharpened newTopic to rebuild the lesson around. { done, message, newTopic }.
export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const { topic, messages } = await request.json();
    if (!topic) return NextResponse.json({ done: false, message: 'What were you hoping to learn?', newTopic: null });
    const result = await generateTopicRefinement(topic, messages || [], profile);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/lesson/refine error:', error);
    return NextResponse.json({ done: false, message: 'Can you tell me a bit more about what you were hoping to learn?', newTopic: null }, { status: 500 });
  }
}
