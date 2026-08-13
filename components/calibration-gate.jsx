'use client';

// Required, blocking first-run calibration. As soon as a user enters the
// platform without a completed calibration, this covers the whole screen with
// the placement quiz — there is no skip and no app chrome to navigate away to.
// Finishing writes `calibrated_at` to the profile, which unmounts the gate and
// lets them through.
//
// SKILLS ONLY. The AI Impact half used to run here too, which made the required
// first session ~20 screens (feedback #207). It now comes back a few days later
// via ImpactAssessmentPrompt / lib/impact-schedule.js.
//
// The whole gate can be switched off in /admin/onboarding-quiz, which is how a
// test round runs with onboarding alone. When it's off nothing here stamps
// `calibrated_at` — so anything that used that date as "this person has finished
// entering the platform" has to ask about the switch too (the tour does).

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/components/profile-provider';
import CalibrationFlow from '@/components/calibration-flow';
import { useAssessmentConfig } from '@/lib/use-assessment-config';
// The device-local marker lives in lib/calibration-local so onboarding's last
// step can ask the same question ("is calibration still ahead of this person?").
import { hasLocalCalibrated, markLocalCalibrated } from '@/lib/calibration-local';

// Routes that must never be gated: onboarding (you need a profile first) and auth.
function isExempt(pathname) {
  return pathname === '/onboarding' || pathname.startsWith('/auth');
}

export default function CalibrationGate() {
  const pathname = usePathname();
  const { profile, updateProfile } = useProfile();
  // Admins can switch the placement quiz off entirely (/admin/onboarding-quiz).
  // While `loading` we show nothing: this is a full-screen blocking overlay, and
  // flashing it up for half a second before deciding it shouldn't run is worse
  // than a beat of nothing.
  const { config, loading } = useAssessmentConfig({ enabled: !!profile });

  // Whether the gate will actually cover the screen. Computed before any early
  // return so the effect below can be unconditional (hooks can't be).
  const showing = !!profile
    && config.quiz_enabled
    && !loading
    && !profile.calibrated_at
    && !isExempt(pathname)
    && !hasLocalCalibrated(profile.email);

  // Tell the rest of the app that a full-screen overlay is up. The feedback form
  // records window.location's pathname, but this gate renders OVER whatever route
  // the user happens to be on — so a report filed here was stamped with e.g.
  // "/leaderboard" while the person was plainly looking at calibration (that is
  // exactly what happened on feedback #84, and it cost real triage time).
  useEffect(() => {
    if (!showing) return undefined;
    document.documentElement.dataset.overlay = 'calibration';
    return () => { delete document.documentElement.dataset.overlay; };
  }, [showing]);

  // Wait until we have a profile (ProfileProvider redirects to onboarding if
  // there isn't one). Once calibrated — by the profile flag OR the local marker
  // — the gate never shows again.
  if (!showing) return null;

  function handleComplete() {
    // Mark locally FIRST so a stale profile refetch can't re-open the gate.
    markLocalCalibrated(profile.email);
    updateProfile({ calibrated_at: new Date().toISOString() }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-bg-warm dark:bg-slate-900">
      <div className="min-h-full">
        <CalibrationFlow gated sections={['skills']} onComplete={handleComplete} />
      </div>
    </div>
  );
}
