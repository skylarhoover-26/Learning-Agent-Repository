// Server-side read for the learner's work projects.
//
// Projects are NOT part of the profile document — they live under their own
// `work_projects` user-data key, written by components/projects-manager.jsx.
// That's why no generator ever saw them: every lesson prompt is built from the
// profile object alone.
//
// Rather than move the data (a migration for no benefit), generation routes call
// withProjects() to hand the generators a profile that carries them. The merged
// object is per-request and never written back, so there is no second copy of
// the project list to drift out of date.

import { getUserData } from './blob-store';
import { readDoc } from './supabase-store';

// Same read order as GET /api/user-data: Supabase first, blob as the fallback
// for anything written before the migration or during a transient miss.
export async function getWorkProjects(email) {
  if (!email) return [];
  try {
    let data = await readDoc(email, 'work_projects');
    if (data === null || data === undefined) {
      data = await getUserData(email, 'work_projects');
    }
    // Blob reads can come back wrapped as { data: [...] } depending on when the
    // record was written.
    const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    return list.filter((p) => p && typeof p === 'object');
  } catch {
    // Projects are one signal of four. A failed read must never cost the learner
    // their lesson — generation carries on with tasks, goals and tools.
    return [];
  }
}

// Attach projects to a profile for generation. Pass the projects in when the
// caller already has them (the daily pre-generation cron reads them once for the
// signature) to avoid a second round trip.
export async function withProjects(profile, projects) {
  if (!profile) return profile;
  if (projects) return { ...profile, work_projects: projects };
  // Already carried in — don't pay for a second read. This path is real:
  // ensureDailyPickLesson attaches projects and then calls resolveDailyPick, which
  // attaches them too, and the pre-gen cron runs that chain for every learner.
  if (Array.isArray(profile.work_projects)) return profile;
  return { ...profile, work_projects: await getWorkProjects(profile.email) };
}
