import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateTopicRefinement } from '@/lib/ai';

// LLM call — give it room so it isn't killed at Vercel's short default timeout
// (which would surface as the repeating "tell me more" fallback).
export const maxDuration = 60;

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
    // Report the failure as a failure. This used to answer with a real-looking
    // question, so a learner hitting a persistent error just saw the same prompt
    // every turn with no sign anything was wrong (feedback #182).
    return NextResponse.json({ error: true, done: false, message: null, newTopic: null }, { status: 500 });
  }
}
