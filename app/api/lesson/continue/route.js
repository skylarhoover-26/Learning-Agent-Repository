import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateLessonResponse } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';

export async function POST(request) {
  try {
    const { topic, messages, userInput, pace, difficulty, format, tool } = await request.json();
    const profile = await getAuthenticatedProfile();
    const profileForGen = tool ? { ...profile, preferred_tool: tool } : profile;

    const updatedMessages = [
      ...messages,
      { role: 'user', content: userInput },
    ];

    const start = Date.now();
    let response;
    let error;

    try {
      response = await generateLessonResponse(topic, updatedMessages, profileForGen, {
        format,
        pace,
        difficulty,
      });
    } catch (err) {
      error = err;
    }

    logAuditEntry({
      type: 'lesson_continue',
      endpoint: '/api/lesson/continue',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { topic, userInput, format, phase: response?.phase || 'unknown', messageCount: updatedMessages.length },
      output: error ? null : { slideTitle: response?.slideTitle, phase: response?.phase, message: response?.message, keyPoints: response?.keyPoints },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

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
