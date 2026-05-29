import { cookies } from 'next/headers';

const COOKIE_NAME = 'learner_profile';
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * Read profile from cookie (server-side, uses next/headers cookies()).
 * Auto-refreshes the cookie expiry on every read so it only expires
 * if the user doesn't visit for ~400 days.
 * Returns the profile object or null.
 */
export async function getProfile() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);
    if (!cookie || !cookie.value) return null;
    const profile = JSON.parse(decodeURIComponent(cookie.value));

    cookieStore.set(COOKIE_NAME, cookie.value, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });

    return profile;
  } catch {
    return null;
  }
}
