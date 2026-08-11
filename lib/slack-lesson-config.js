// Whether learners can take a lesson inside Slack, stored as a system blob so it
// can be flipped from the admin UI without a redeploy (same pattern as the notify
// allowlist and menu visibility).
//
// Default is OFF and that matters: the "Take it here in Slack" button only appears
// in the daily DM when this is on, so an unfinished or paused rollout shows no
// button rather than a button that does nothing.

import { getUserData, saveUserData } from './blob-store';

const SYSTEM_ID = '__system__';
const TYPE = 'slack_lesson_config';

export async function getSlackLessonConfig() {
  try {
    const data = await getUserData(SYSTEM_ID, TYPE);
    return {
      enabled: data?.enabled === true,
      updated_at: data?.updated_at || null,
    };
  } catch (error) {
    // Fail closed. A blob hiccup should hide the feature, never half-enable it.
    console.error('getSlackLessonConfig failed:', error?.message || error);
    return { enabled: false, updated_at: null };
  }
}

export async function isSlackLessonEnabled() {
  const { enabled } = await getSlackLessonConfig();
  return enabled;
}

export async function setSlackLessonEnabled(enabled) {
  const value = { enabled: enabled === true, updated_at: new Date().toISOString() };
  await saveUserData(SYSTEM_ID, TYPE, value);
  return value;
}
