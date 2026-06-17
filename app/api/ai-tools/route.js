import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { AI_TOOLS } from '@/lib/ai-tools';
import { getMergedTools, setToolOverrides } from '@/lib/ai-tools-store';

// GET is public: every surface that renders the tool list needs the merged
// catalog (defaults + admin overrides).
export async function GET() {
  try {
    const tools = await getMergedTools();
    return NextResponse.json({ tools });
  } catch {
    return NextResponse.json({ tools: AI_TOOLS });
  }
}

// POST is admin-only: save the catalog overrides.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !(await isAdmin(user.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { tools } = await request.json();
    await setToolOverrides(tools);
    return NextResponse.json({ tools: await getMergedTools() });
  } catch (error) {
    console.error('POST /api/ai-tools error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
