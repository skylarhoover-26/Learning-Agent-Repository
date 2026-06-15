import { getAdminAllowlist } from './admin-store';

const ADMIN_EMAILS_KEY = 'ADMIN_EMAILS';

function getAdminEmails() {
  const raw = process.env[ADMIN_EMAILS_KEY] || '';
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

// Seed admins from the env var — permanent, can't be removed from the UI.
export function getSeedAdminEmails() {
  return getAdminEmails();
}

// Sync, env-only check (the seed). Used to mark seed admins in the UI.
export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

// Authoritative admin check: env seed OR the UI-managed blob allowlist.
export async function isAdmin(email) {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (getAdminEmails().includes(e)) return true;
  const extra = await getAdminAllowlist();
  return extra.includes(e);
}
