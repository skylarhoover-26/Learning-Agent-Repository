import { auth } from '@/auth';
import { getUserData } from '@/lib/blob-store';

const oktaConfigured = !!(process.env.AUTH_OKTA_ID && process.env.AUTH_OKTA_SECRET && process.env.AUTH_OKTA_ISSUER);

const DEFAULT_USER = {
  email: 'demo@housecallpro.com',
  name: 'Demo User',
};

export async function getAuthenticatedUser() {
  if (!oktaConfigured) return DEFAULT_USER;
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
    return { email: DEFAULT_USER.email, name: DEFAULT_USER.name, onboarded: false };
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
