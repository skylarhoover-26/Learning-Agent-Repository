import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdminEmail } from '@/lib/admin';
import { SKILL_CATALOG } from '@/lib/heatmap-data';
import { getMergedSkillLevels, setSkillLevels, VALID_LEVELS } from '@/lib/skill-levels';

// GET is public: any signed-in user's recommendations need the level map.
export async function GET() {
  const levels = await getMergedSkillLevels();
  return NextResponse.json({ catalog: SKILL_CATALOG, levels, validLevels: VALID_LEVELS });
}

// POST is admin-only: save the level overrides.
export async function POST(request) {
  const user = await getAuthenticatedUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const { levels } = await request.json();
    await setSkillLevels(levels);
    const merged = await getMergedSkillLevels();
    return NextResponse.json({ levels: merged });
  } catch (error) {
    console.error('POST /api/skill-levels error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
