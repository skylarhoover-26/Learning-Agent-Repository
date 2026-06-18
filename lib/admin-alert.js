// Server-only helper to alert admins about operational problems (e.g. a lesson
// that failed to generate after every retry). Sends a Slack DM to the people on
// the notification allowlist (falling back to the admin list), and supports a
// throttle so a systemic failure can't trigger an alert storm.

import { getNotifyAllowlist } from './notify-allowlist';
import { getAdminAllowlist } from './admin-store';
import { getSeedAdminEmails } from './admin';
import { sendSlackDirectMessage } from './slack-notify';
import { getUserData, saveUserData } from './blob-store';

const SYSTEM_ID = '__system__';

async function resolveRecipients() {
  const notify = await getNotifyAllowlist().catch(() => []);
  if (notify.length) return notify;
  // Fall back to admins so an alert still lands if no allowlist is configured.
  const admins = await getAdminAllowlist().catch(() => []);
  const seed = getSeedAdminEmails();
  return Array.from(new Set(
    [...(admins || []), ...(seed || [])]
      .map((e) => String(e).trim().toLowerCase())
      .filter((e) => e.includes('@'))
  ));
}

export async function alertAdmins(text, options = {}) {
  const { throttleKey, throttleMinutes = 10 } = options;
  try {
    if (throttleKey) {
      const key = `alert_throttle_${throttleKey}`;
      const last = await getUserData(SYSTEM_ID, key).catch(() => null);
      const lastAt = last?.at ? new Date(last.at).getTime() : 0;
      if (Date.now() - lastAt < throttleMinutes * 60 * 1000) {
        return { ok: false, skipped: 'throttled' };
      }
      await saveUserData(SYSTEM_ID, key, { at: new Date().toISOString() }).catch(() => {});
    }

    const emails = await resolveRecipients();
    if (!emails.length) return { ok: false, skipped: 'no_recipients' };

    const results = await Promise.all(
      emails.map((e) => sendSlackDirectMessage(e, text).catch(() => ({ ok: false })))
    );
    return { ok: results.some((r) => r.ok), sent: results.filter((r) => r.ok).length };
  } catch (error) {
    console.error('alertAdmins failed:', error);
    return { ok: false, error: error.message };
  }
}
