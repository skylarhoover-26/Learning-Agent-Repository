import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { generateChatReply } from '@/lib/ai';

export async function POST(request) {
  try {
    const { messages } = await request.json();
    const profile = await getAuthenticatedProfile();

    const reply = await generateChatReply(messages, profile);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
