import { getStaleSkillMarks } from '@/lib/skill-staleness';

// Reads a mutable system blob the daily news scan writes to, so this must never
// be statically cached — a stale route would keep serving yesterday's marks.
export const dynamic = 'force-dynamic';

// Which skills the news says are worth a refresh. Read-only and non-personal:
// the marks are org-wide, and the heatmap decides per learner whether a mark
// applies (it only does if they last studied that skill before the release).
export async function GET() {
  try {
    const marks = await getStaleSkillMarks();
    return Response.json({ marks });
  } catch (error) {
    console.error('skill-staleness GET failed:', error);
    // Degrade to "nothing is stale" rather than breaking the heatmap.
    return Response.json({ marks: [] });
  }
}
