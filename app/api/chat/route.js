import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateChatReply } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';
import { detectLessonTopic } from '@/lib/lesson-intent';

export async function POST(request) {
  try {
    const { messages } = await request.json();
    const profile = await getAuthenticatedProfile();

    const start = Date.now();
    let reply;
    let error;

    try {
      reply = await generateChatReply(messages, profile);
    } catch (err) {
      error = err;
    }

    const userMessage = messages?.[messages.length - 1]?.content || '';
    logAuditEntry({
      type: 'chat',
      endpoint: '/api/chat',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: 'claude-sonnet-4-6',
      input: { userMessage, messageCount: messages?.length || 0 },
      output: error ? null : { reply },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

    // Server-side lesson-intent detection: if the learner asked a
    // what/how/explain question, surface the topic so chat can offer a lesson.
    const lessonTopic = detectLessonTopic(userMessage);

    return NextResponse.json({ reply, lessonTopic });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
