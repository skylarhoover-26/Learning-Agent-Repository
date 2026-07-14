'use client';

// Required, blocking first-run calibration. As soon as a user enters the
// platform without a completed calibration, this covers the whole screen with
// the unified assessment — there is no skip and no app chrome to navigate away
// to. It replaces the old optional tour prompt as the very first thing a new (or
// not-yet-calibrated) user sees. Finishing writes `calibrated_at` to the
// profile, which unmounts the gate and lets them through.

import { usePathname } from 'next/navigation';
import { useProfile } from '@/components/profile-provider';
import CalibrationFlow from '@/components/calibration-flow';

// Routes that must never be gated: onboarding (you need a profile first), auth,
// and the public token-shared report.
function isExempt(pathname) {
  return (
    pathname === '/onboarding' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/reporting/shared')
  );
}

export default function CalibrationGate() {
  const pathname = usePathname();
  const { profile, updateProfile } = useProfile();

  // Wait until we have a profile (ProfileProvider redirects to onboarding if
  // there isn't one). Once calibrated, the gate never shows again.
  if (!profile || profile.calibrated_at || isExempt(pathname)) return null;

  function handleComplete() {
    updateProfile({ calibrated_at: new Date().toISOString() }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-bg-warm dark:bg-slate-900">
      <div className="min-h-full">
        <CalibrationFlow gated onComplete={handleComplete} />
      </div>
    </div>
  );
}
