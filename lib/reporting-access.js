import { getUserData, saveUserData } from './blob-store';
import { isAdmin } from './admin';
import { isManagerEmail } from './manager-data';

// Who can see org-wide reporting.
//
// Sharing a report here means sending someone the URL — Okta proves who they
// are, and this list decides whether they get in. That is deliberately NOT a
// public token link: one of those existed in June (commit f6dfd2a) and was
// removed the same day (c86bbd7) once the report started showing the full
// roster including who had never signed in. The data has only got more personal
// since — per-person lesson scores, failures, and level changes. A named list
// behind SSO can be revoked, is attributable, and can't be forwarded.
//
// SERVER ONLY — imports blob-store.
const SYSTEM_ID = '__system__';
const TYPE = 'reporting_viewers';

export async function getReportingViewers() {
  try {
    const data = await getUserData(SYSTEM_ID, TYPE);
    return Array.isArray(data?.emails) ? data.emails : [];
  } catch {
    return [];
  }
}

export async function setReportingViewers(emails) {
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

// Admins and managers keep the access they already had; the allowlist adds
// named people on top. Never throws — a failure denies rather than grants.
export async function canViewReporting(email) {
  if (!email) return false;
  const e = String(email).trim().toLowerCase();
  try {
    if (await isAdmin(e)) return true;
    if (await isManagerEmail(e)) return true;
    return (await getReportingViewers()).includes(e);
  } catch {
    return false;
  }
}
