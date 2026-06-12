import { NextResponse } from 'next/server';
import { generateHelpReply } from '@/lib/ai';

export async function POST(request) {
  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }
    const reply = await generateHelpReply(messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('POST /api/help error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
