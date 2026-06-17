import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { generateToolDescription } from '@/lib/ai';

// Any signed-in learner: when they add a custom tool, auto-fill what it's good
// for and its URL so the catalog entry is useful right away.
export async function POST(request) {
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
