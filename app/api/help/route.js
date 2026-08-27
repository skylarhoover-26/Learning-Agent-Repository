import { NextResponse } from 'next/server';
import { generateHelpReply } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';

// Without an explicit maxDuration a Vercel function takes the platform default,
// which is far shorter than an LLM call needs — the request is killed mid-flight
// and the audit entry that would have explained it is never written (feedback
// #232 rediscovered this on the lesson path). Every AI route names its own limit.
export const maxDuration = 60;

export async function POST(request) {
  const limited = await enforceRateLimit('help', 'ai', request);
  if (limited) return limited;

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
