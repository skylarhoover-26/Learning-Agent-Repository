// Admin emails added from the UI (in addition to the ADMIN_EMAILS env seed).
// Stored as a global blob so admins can be managed without a redeploy. Mirrors
// the notify-allowlist pattern.

import { getUserData, saveUserData } from './blob-store';

const SYSTEM_ID = '__system__';
const TYPE = 'admin_allowlist';

export async function getAdminAllowlist() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  return Array.isArray(data?.emails) ? data.emails : [];
}

export async function setAdminAllowlist(emails) {
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
