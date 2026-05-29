import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/profile';
import { generateChatReply } from '@/lib/ai';

export async function POST(request) {
  try {
    const { messages } = await request.json();
    const profile = await getProfile();

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
