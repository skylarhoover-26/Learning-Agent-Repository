const COOKIE_NAME = 'learner_profile';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Save profile to a cookie (client-side only).
 * Call this from a 'use client' component.
 */
export function saveProfile(profile) {
  const json = JSON.stringify(profile);
  const encoded = encodeURIComponent(json);
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Read profile from cookie (client-side, reads document.cookie).
 * Returns the profile object or null.
 */
export function getProfileClient() {
  try {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    const value = match.split('=').slice(1).join('=');
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

/**
 * Generate a random learner ID.
 */
export function generateLearnerId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `learner_${result}`;
}
