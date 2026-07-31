// Per-user, device-local "already calibrated" marker.
//
// The calibration gate closes optimistically when updateProfile sets
// calibrated_at, but a profile refetch can briefly return a stale record whose
// calibrated_at hasn't propagated yet (reads hit Supabase first, with a blob
// fallback). That stale read would re-open the gate and drop the user back at
// step 0 with no way home. This marker keeps the gate closed once they've
// finished, independent of that read timing. The real calibrated_at still
// persists server-side for cross-device.
//
// Lives in its own module because two places need the same answer — the gate
// (should I cover the screen?) and onboarding's last step (is calibration still
// ahead of this person, so the button should say "Continue setup"?). Two copies
// of this rule would drift.

function calKey(email) {
  return email ? `la_calibrated_${String(email).toLowerCase()}` : null;
}

export function hasLocalCalibrated(email) {
  try {
    const key = calKey(email);
    return !!(key && localStorage.getItem(key));
  } catch {
    return false;
  }
}

export function markLocalCalibrated(email) {
  try {
    const key = calKey(email);
    if (key) localStorage.setItem(key, new Date().toISOString());
  } catch {
    /* storage may be unavailable — the server calibrated_at still gates */
  }
}

// "Does this person still owe us a calibration?" — true unless we positively
// know they've already done it. Defaulting to pending matters during onboarding:
// a brand-new user has no profile yet, and they are exactly the person who is
// about to meet the calibration gate.
//
// Note this is deliberately NOT what the gate itself uses to decide whether to
// cover the screen; the gate additionally requires a loaded profile and a
// non-exempt route. This answers the narrower question of what's still ahead.
export function isCalibrationPending(profile, email) {
  if (profile?.calibrated_at) return false;
  return !hasLocalCalibrated(email || profile?.email);
}
