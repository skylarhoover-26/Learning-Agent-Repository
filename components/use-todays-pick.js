'use client';

import { useState, useEffect } from 'react';
import { useProgression } from '@/components/progression-provider';
import { useProfile } from '@/components/profile-provider';
import { getAllModuleProgress } from '@/lib/module-store';
import { getCalibrationSkills } from '@/lib/calibration-store';
import { computeDailyPick } from '@/lib/daily-pick';

// The personalized "Today's Pick" recommendation (or null while loading).
// Shared by the home card and the sidebar "Today's Pick" redirect so they always
// agree on the same pick — AND with the server-side copy that gets pre-generated
// for the daily Slack nudge. Primary source is the server (/api/daily-pick);
// falls back to computing locally from the same signals if that's unavailable.
export function useTodaysPick() {
  const prog = useProgression();
  const { profile, workProjects } = useProfile();
  const [pick, setPick] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Primary: the server-computed pick — the same one pre-generated for the
      // Slack nudge, so the card, the /daily link, and the lesson all match.
      try {
        const res = await fetch('/api/daily-pick', { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          if (!cancelled && d?.pick) { setPick(d.pick); return; }
        }
      } catch {
        // fall through to local compute
      }

      // Fallback: compute locally if the server pick isn't available yet. Needs
      // progression loaded (for lesson history) + the admin level overrides.
      if (cancelled || !prog?.isLoaded) return;
      try {
        const lr = await fetch('/api/skill-levels');
        const levelOverrides = lr.ok ? (await lr.json()).levels || {} : {};
        if (cancelled) return;
        const moduleProgress = typeof window !== 'undefined' ? getAllModuleProgress() : {};
        const calibrationSkills = typeof window !== 'undefined' ? getCalibrationSkills() : null;
        setPick(computeDailyPick({
          lessonHistory: prog.lessonHistory,
          moduleProgress,
          calibrationSkills,
          tier: profile?.tier,
          levelOverrides,
          // The heatmap still chooses the skill; the profile only rewords it into
          // the learner's tasks, goals and projects. Projects are a separate key,
          // so they're merged in here rather than living on `profile`.
          profile: profile ? { ...profile, work_projects: workProjects || [] } : null,
        }));
      } catch {
        // leave pick null — the card just shows its loading state
      }
    })();
    return () => { cancelled = true; };
  }, [prog?.isLoaded, prog?.lessonHistory, profile, workProjects]);

  return pick;
}
