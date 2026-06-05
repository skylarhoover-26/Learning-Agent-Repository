import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonResponse } from '@/lib/ai';

export async function POST(request) {
  try {
    const { topic, messages, userInput, pace, difficulty, format } = await request.json();
    const profile = await getAuthenticatedProfile();

    const updatedMessages = [
      ...messages,
      { role: 'user', content: userInput },
    ];

    const response = await generateLessonResponse(topic, updatedMessages, profile, {
      format,
      pace,
      difficulty,
    });

    const finalMessages = [
      ...updatedMessages,
      { role: 'assistant', content: JSON.stringify(response) },
    ];

    return NextResponse.json({ ...response, messages: finalMessages });
  } catch (error) {
    console.error('POST /api/lesson/continue error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to continue lesson' },
      { status: 500 }
    );
  }
}
