const ADMIN_EMAILS_KEY = 'ADMIN_EMAILS';

function getAdminEmails() {
  const raw = process.env[ADMIN_EMAILS_KEY] || '';
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
