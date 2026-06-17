import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { getMergedTools } from '@/lib/ai-tools-store';
import { generateToolStrengthSuggestions } from '@/lib/ai';

// Admin-only: ask the model to propose refreshed "what it's good for" phrasing
// for the whole catalog. The admin reviews and saves via POST /api/ai-tools.
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const tools = await getMergedTools();
    const suggestions = await generateToolStrengthSuggestions(tools);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('POST /api/ai-tools/suggest error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
