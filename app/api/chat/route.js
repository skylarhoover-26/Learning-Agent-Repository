import { MODELS } from '@/lib/models';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateChatReply } from '@/lib/ai';
import { logAuditEntry } from '@/lib/audit-log';
import { detectLessonTopic } from '@/lib/lesson-intent';

export async function POST(request) {
  try {
    const { messages, tools } = await request.json();
    const profile = await getAuthenticatedProfile();
    const profileForGen = tools ? { ...profile, preferred_tools: tools } : profile;

    const start = Date.now();
    let result;
    let error;

    try {
      result = await generateChatReply(messages, profileForGen);
    } catch (err) {
      error = err;
    }

    const userMessage = messages?.[messages.length - 1]?.content || '';
    logAuditEntry({
      type: 'chat',
      endpoint: '/api/chat',
      user: { email: profile?.email || 'unknown', name: profile?.display_name || 'Unknown' },
      model: MODELS.sonnet,
      input: { userMessage, messageCount: messages?.length || 0 },
      output: error ? null : { reply: result?.reply, lessonTopic: result?.lessonTopic || null },
      durationMs: Date.now() - start,
      error: error?.message || null,
    }).catch(() => {});

    if (error) throw error;

    // Prefer the model's lesson-topic judgement (it understands intent); fall
    // back to the regex detector if the tag was missing.
    const lessonTopic = result.lessonTopic || detectLessonTopic(userMessage);

    return NextResponse.json({ reply: result.reply, lessonTopic });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
