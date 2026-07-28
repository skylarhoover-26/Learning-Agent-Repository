// Pre-generate + cache the "Today's Pick" lesson so opening it (from the Slack
// nudge OR the in-app card) is instant instead of a 30-60s cold generate. Used
// by both the pre-gen cron (many learners, mornings) and warm-on-open (one
// learner, when they land on home). The client hydrates from this cache in
// components/plan-lesson-player.jsx and skips generation on a hit.
//
// We pre-build the PLAN + the FIRST teach step — that's exactly what the lesson
// needs to reveal its opening screen. The remaining teach steps prefetch in the
// background client-side (already built), so this stays bounded even across a
// whole team.

import { getUserData, saveUserData } from '@/lib/blob-store';
import { resolveDailyPick } from '@/lib/daily-pick-server';
import { generateLessonPlan, generateTeachStep } from '@/lib/ai';
import { resolveTools } from '@/lib/ai-tools';
import { contentDayKey } from '@/lib/content-day';

const CACHE_KEY = 'daily_pick_lesson';
// A topic-only pick link (/lesson?topic=...) opens a standard, read-mode lesson.
const PICK_FORMAT = 'standard';

// Read the cached pre-generated lesson for this learner IF it matches today's
// pick (topic + format). Returns { plan, teach, toolIds, ... } or null.
export async function readDailyPickLesson(email, topic, format = PICK_FORMAT) {
  if (!email || !topic) return null;
  const raw = await getUserData(email, CACHE_KEY);
  const c = raw?.data || raw;
  if (!c || c.date !== contentDayKey()) return null;
  if (c.topic !== topic || (c.format || PICK_FORMAT) !== format) return null;
  if (!c.plan?.steps?.length) return null;
  return c;
}

// Resolve today's pick for this learner, then generate + cache its lesson (plan
// + first teach step). Idempotent per content-day+topic unless `force`. Never
// throws — returns a small status object.
export async function ensureDailyPickLesson(profile, { force = false } = {}) {
  try {
    if (!profile?.email) return { skipped: 'no_profile' };
    const email = profile.email;
    const today = contentDayKey();

    const { pick } = await resolveDailyPick(profile);
    if (!pick?.topic) return { skipped: 'no_topic' }; // e.g. the "start your journey" pick

    const topic = pick.topic;
    const format = PICK_FORMAT;

    if (!force) {
      const existing = await readDailyPickLesson(email, topic, format);
      if (existing) return { cached: true, topic };
    }

    // Center the lesson on the learner's primary tool (the "else primary" branch
    // of the normal recommend-if-owned-else-primary resolution).
    const tools = resolveTools(profile);
    const toolIds = tools.length ? [tools[0].id] : undefined;
    const profileForGen = toolIds ? { ...profile, preferred_tools: toolIds } : profile;

    const plan = await generateLessonPlan(topic, profileForGen, { format });
    if (!plan?.steps?.length) return { error: 'no_plan', topic };

    // Pre-build the first teach step so the opening screen shows instantly.
    const teach = {};
    const firstIdx = plan.steps.findIndex((s) => s.kind === 'teach');
    if (firstIdx !== -1) {
      const step = plan.steps[firstIdx];
      const nextStep = plan.steps[firstIdx + 1];
      const nextActivity = nextStep?.kind === 'activity' ? nextStep : null;
      const upcoming = nextActivity
        ? {
            activityType: nextActivity.activityType,
            objective: plan.objectives?.find((o) => o.id === nextActivity.objectiveId)?.text || '',
          }
        : null;
      try {
        const t = await generateTeachStep(topic, profileForGen, {
          step,
          objectives: plan.objectives || [],
          priorTitles: [],
          priorContent: [],
          upcoming,
          format,
        });
        if (t?.message) {
          teach[step.id] = { message: t.message, blocks: t.blocks || [], keyPoints: t.keyPoints || [] };
        }
      } catch {
        // A missing first-step just means the client generates it on open — the
        // plan cache alone still saves the biggest chunk of the wait.
      }
    }

    await saveUserData(email, CACHE_KEY, {
      date: today,
      topic,
      format,
      toolIds: toolIds || null,
      recommendation: null,
      plan,
      teach,
    });
    return { generated: true, topic, teachSteps: Object.keys(teach).length };
  } catch (error) {
    console.error('ensureDailyPickLesson failed:', error?.message || error);
    return { error: 'exception' };
  }
}
