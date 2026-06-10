// The admin-managed list of people who receive Slack notifications. Stored as a
// global blob so it can be edited from the admin UI without a redeploy.

import { getUserData, saveUserData } from './blob-store';

const SYSTEM_ID = '__system__';
const TYPE = 'notify_allowlist';

export async function getNotifyAllowlist() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  return Array.isArray(data?.emails) ? data.emails : [];
}

export async function setNotifyAllowlist(emails) {
  const clean = Array.from(
    new Set(
      (Array.isArray(emails) ? emails : [])
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => e.includes('@'))
    )
  );
  await saveUserData(SYSTEM_ID, TYPE, { emails: clean, updated_at: new Date().toISOString() });
  return clean;
}
