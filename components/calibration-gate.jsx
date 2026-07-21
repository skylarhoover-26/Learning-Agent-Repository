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

// Per-user local "already calibrated" marker. The gate closes optimistically when
// updateProfile sets calibrated_at, but a profile refetch can briefly return a
// stale record whose calibrated_at hasn't propagated yet (reads hit Supabase
// first, with a blob fallback). That stale read would re-open the gate and drop
// the user back at step 0 with no way home. This device-local marker keeps the
// gate closed once they've finished, independent of that read timing. The real
// calibrated_at still persists server-side for cross-device.
function calKey(email) {
  return email ? `la_calibrated_${String(email).toLowerCase()}` : null;
}
function hasLocalCalibrated(email) {
  try {
    const k = calKey(email);
    return !!(k && localStorage.getItem(k));
  } catch {
    return false;
  }
}
function markLocalCalibrated(email) {
  try {
    const k = calKey(email);
    if (k) localStorage.setItem(k, new Date().toISOString());
  } catch {
    /* storage may be unavailable — the server calibrated_at still gates */
  }
}

export default function CalibrationGate() {
  const pathname = usePathname();
  const { profile, updateProfile } = useProfile();

  // Wait until we have a profile (ProfileProvider redirects to onboarding if
  // there isn't one). Once calibrated — by the profile flag OR the local marker
  // — the gate never shows again.
  if (!profile || profile.calibrated_at || isExempt(pathname)) return null;
  if (hasLocalCalibrated(profile.email)) return null;

  function handleComplete() {
    // Mark locally FIRST so a stale profile refetch can't re-open the gate.
    markLocalCalibrated(profile.email);
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
