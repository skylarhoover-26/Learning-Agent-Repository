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
import { signalSignature } from '@/lib/learner-signals';
import { withProjects } from '@/lib/work-projects';

const PICK_KEY = 'daily_pick';

// Returns { pick, date, cached }. `pick` is null only for a profile with no email.
export async function resolveDailyPick(rawProfile) {
  if (!rawProfile?.email) return { pick: null, date: null, cached: false };
  // Projects live outside the profile document; the pick's wording and its
  // signature both depend on them, so load them before anything is cached.
  const profile = await withProjects(rawProfile);
  const email = profile.email;
  const learnerId = resolveLearnerId(profile);
  const today = contentDayKey();
  const sig = signalSignature(profile);

  // Reuse a pick already computed for today (set here, or pre-written by warm /
  // pre-gen). Deterministic per day, so a miss just recomputes the same thing.
  //
  // The signature is part of the match, not just the date: the pick is now worded
  // through the learner's tasks, goals and projects, so editing any of those has
  // to re-word today's pick instead of serving the one built from the profile they
  // had this morning.
  const cached = await getUserData(email, PICK_KEY);
  const cachedData = cached?.data || cached;
  if (cachedData?.date === today && cachedData?.pick && (cachedData.sig || null) === sig) {
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
    profile,
  });

  await saveUserData(email, PICK_KEY, { date: today, sig, pick }).catch(() => {});
  return { pick, date: today, cached: false };
}
