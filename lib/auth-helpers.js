import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { getUserData } from '@/lib/blob-store';
import { nameFromEmail } from '@/lib/display-name';

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

export async function getAuthenticatedProfile() {
  if (!oktaConfigured) {
    const email = (await getIdentityEmail()) || DEFAULT_USER.email;
    const fallbackName = email === DEFAULT_USER.email ? DEFAULT_USER.name : deriveName(email);
    try {
      const profile = await getUserData(email, 'profile');
      if (profile && profile.department) {
        return { ...profile, email, onboarded: true };
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
    return { ...profile, onboarded: true };
  } catch {
    return null;
  }
}
