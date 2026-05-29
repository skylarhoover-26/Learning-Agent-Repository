import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile';
import { generateLessonResponse } from '@/lib/ai';

export async function POST(request) {
  try {
    const { topic, format } = await request.json();
    const profile = await getProfile();

    const messages = [{ role: 'user', content: 'Start the lesson' }];
    const response = await generateLessonResponse(topic, messages, profile, { format });

    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: JSON.stringify(response) },
    ];

    return NextResponse.json({ ...response, messages: updatedMessages });
  } catch (error) {
    console.error('POST /api/lesson/start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start lesson' },
      { status: 500 }
    );
  }
}
