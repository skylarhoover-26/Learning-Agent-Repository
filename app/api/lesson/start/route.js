import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonResponse } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { topic, format } = await request.json();
    const profile = await getAuthenticatedProfile();

    const messages = [{ role: 'user', content: 'Start the lesson' }];

    const start = Date.now();
    let response;
    let error;

    try {
      response = await generateLessonResponse(topic, messages, profile, { format });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_start',
      endpoint: '/api/lesson/start',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic, format },
      output: error ? null : { slideTitle: response?.slideTitle, phase: response?.phase, message: response?.message, keyPoints: response?.keyPoints },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

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
