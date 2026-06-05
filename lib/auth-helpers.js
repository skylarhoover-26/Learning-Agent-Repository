import { auth } from '@/auth';
import { getUserData } from '@/lib/blob-store';

export async function getAuthenticatedUser() {
  try {
    const session = await auth();
    if (!session?.user?.email) return null;
    return session.user;
  } catch {
    return null;
  }
}

export async function getAuthenticatedProfile() {
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
