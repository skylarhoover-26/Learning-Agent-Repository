// Server-side "Today's Pick" resolution — shared by the /api/daily-pick route
// and the lesson pre-generation (lib/daily-pick-lesson.js). Reads the learner's
// Supabase-backed signals, runs the shared algorithm, and caches the pick per
// content-day so the browser, the /daily link, and the pre-generated lesson all
// agree on one pick.

import { getUserData, saveUserData } from '@/lib/blob-store';
import { resolveLearnerId } from '@/lib/learner-id';
import { getMergedSkillLevels } from '@/lib/skill-levels';
import { computeDailyPick } from '@/lib/daily-pick';
import { contentDayKey } from '@/lib/content-day';

const PICK_KEY = 'daily_pick';

// Returns { pick, date, cached }. `pick` is null only for a profile with no email.
export async function resolveDailyPick(profile) {
  if (!profile?.email) return { pick: null, date: null, cached: false };
  const email = profile.email;
  const learnerId = resolveLearnerId(profile);
  const today = contentDayKey();

  // Reuse a pick already computed for today (set here, or pre-written by warm /
  // pre-gen). Deterministic per day, so a miss just recomputes the same thing.
  const cached = await getUserData(email, PICK_KEY);
  const cachedData = cached?.data || cached;
  if (cachedData?.date === today && cachedData?.pick) {
    return { pick: cachedData.pick, date: today, cached: true };
  }

  const [lessonsRaw, moduleRaw, calibrationRaw, levelOverrides] = await Promise.all([
    getUserData(email, `lp_lessons_${learnerId}`),
    getUserData(email, 'learner_module_state'),
    getUserData(email, 'calibration_profile'),
    getMergedSkillLevels().catch(() => ({})),
  ]);
  const lessonHistory = Array.isArray(lessonsRaw?.data) ? lessonsRaw.data
    : Array.isArray(lessonsRaw) ? lessonsRaw : [];
  const moduleState = moduleRaw?.data || moduleRaw || {};
  const moduleProgress = moduleState.modules || {};
  const calibration = calibrationRaw?.data || calibrationRaw || null;
  const calibrationSkills = calibration?.skills || null;

  const pick = computeDailyPick({
    lessonHistory,
    moduleProgress,
    calibrationSkills,
    tier: profile.tier,
    levelOverrides: levelOverrides || {},
  });

  await saveUserData(email, PICK_KEY, { date: today, pick }).catch(() => {});
  return { pick, date: today, cached: false };
}
