import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { generateToolDescription } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';

// Without an explicit maxDuration a Vercel function takes the platform default,
// which is far shorter than an LLM call needs — the request is killed mid-flight
// and the audit entry that would have explained it is never written (feedback
// #232 rediscovered this on the lesson path). Every AI route names its own limit.
export const maxDuration = 60;

// Any signed-in learner: when they add a custom tool, auto-fill what it's good
// for and its URL so the catalog entry is useful right away.
export async function POST(request) {
  const limited = await enforceRateLimit('tools/describe', 'ai', request);
  if (limited) return limited;

  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { name } = await request.json();
    const clean = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    if (!clean) return NextResponse.json({ strengths: '', url: '' });
    const result = await generateToolDescription(clean);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/tools/describe error:', error);
    return NextResponse.json({ strengths: '', url: '' });
  }
}
