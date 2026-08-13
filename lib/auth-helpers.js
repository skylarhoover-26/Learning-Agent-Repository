import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { getUserData } from '@/lib/blob-store';
import { nameFromEmail } from '@/lib/display-name';
import { seedScore, tierFromState, bandFor } from '@/lib/adaptive-level';

export const oktaConfigured = !!(process.env.AUTH_OKTA_ID && process.env.AUTH_OKTA_SECRET && process.env.AUTH_OKTA_ISSUER);

// Pre-Okta "soft login": testers enter their email once, stored in this cookie,
// so each person's data is keyed by their own email. When Okta is enabled, the
// session email takes over — and because the blob store keys by email, anyone
// who used their real company email keeps their data automatically.
export const IDENTITY_COOKIE = 'la_identity';

const DEFAULT_USER = {
  email: 'demo@housecallpro.com',
  name: 'Demo User',
};

// Validate the address the way Okta will, so identities match post-cutover.
export function isCompanyEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@housecallpro\.com$/.test(email.trim().toLowerCase());
}

// "jane.doe@housecallpro.com" -> "Jane Doe"
export function deriveName(email) {
  return nameFromEmail(email) || email;
}

// The email chosen via the soft-login cookie (null if none). Okta-off only.
export async function getIdentityEmail() {
  try {
    const store = await cookies();
    const email = store.get(IDENTITY_COOKIE)?.value;
    return email && isCompanyEmail(email) ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  if (!oktaConfigured) {
    const email = await getIdentityEmail();
    if (email) return { email, name: deriveName(email) };
    return DEFAULT_USER;
  }
  try {
    const session = await auth();
    if (!session?.user?.email) return null;
    return session.user;
  } catch {
    return null;
  }
}

// Adaptive difficulty: replace the profile's declared `tier` with the EARNED
// tier for generation. The earned tier is decided on the client as each activity
// finishes (lib/adaptive-store) and stored in the `adaptive_level` doc; this reads
// it back so every generator targets the level someone is actually working at.
//
// It is READ here, not recomputed. It used to be derived on each read as
// "declared tier, shifted one rung by the current band", which could never
// express a learner who had drifted two rungs from what they declared, and kept
// re-anchoring to the declaration forever.
//
// With no history yet, the score seeds from the declared tier (plus calibration,
// when the placement quiz is running) and the earned tier IS the declared one —
// the first activity is what starts moving it. The declared tier is preserved as
// `declared_tier`, and the performance band + sample count ride along for finer
// prompt nudges. Never throws — on any read failure the profile passes through
// unchanged.
export async function withEffectiveTier(profile, email) {
  try {
    const declared = profile?.tier;
    if (!declared) return profile;
    const adaptive = await getUserData(email, 'adaptive_level');
    let score;
    let samples = 0;
    if (adaptive && typeof adaptive.score === 'number') {
      score = adaptive.score;
      samples = adaptive.samples || 0;
    } else {
      const cal = await getUserData(email, 'calibration_profile');
      score = seedScore({ tier: declared, calibrationSkills: cal?.skills });
    }
    return {
      ...profile,
      // tierFromState falls back to the old band-shift derivation for documents
      // written before the earned tier was stored, so nobody's level jumps on
      // the deploy that ships this.
      tier: tierFromState(adaptive, declared),
      declared_tier: declared,
      performance_band: adaptive?.band || bandFor(score),
      adaptive_samples: samples,
    };
  } catch {
    return profile;
  }
}

export async function getAuthenticatedProfile() {
  if (!oktaConfigured) {
    const email = (await getIdentityEmail()) || DEFAULT_USER.email;
    const fallbackName = email === DEFAULT_USER.email ? DEFAULT_USER.name : deriveName(email);
    try {
      const profile = await getUserData(email, 'profile');
      if (profile && profile.department) {
        return withEffectiveTier({ ...profile, email, onboarded: true }, email);
      }
    } catch {
      // blob read failed — fall through to default
    }
    return { email, name: fallbackName, onboarded: false };
  }
  try {
    const session = await auth();
    if (!session?.user?.email) return null;
    const email = session.user.email.toLowerCase();
    const profile = await getUserData(email, 'profile');
    if (!profile) {
      return { email, name: session.user.name, onboarded: false };
    }
    return withEffectiveTier({ ...profile, onboarded: true }, email);
  } catch {
    return null;
  }
}
