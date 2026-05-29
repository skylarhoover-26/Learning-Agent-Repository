import { cookies } from 'next/headers';

const COOKIE_NAME = 'learner_profile';

/**
 * Read profile from cookie (server-side, uses next/headers cookies()).
 * Returns the profile object or null.
 */
export async function getProfile() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie || !cookie.value) return null;
    return JSON.parse(decodeURIComponent(cookie.value));
  } catch {
    return null;
  }
}
