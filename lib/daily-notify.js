// Shared daily-notification logic, used by both the secret-protected public
// endpoint (n8n) and the admin "Send now" test route.

import { getNotifyAllowlist } from './notify-allowlist';
import { getUserData } from './blob-store';
import { sendSlackDirectMessage } from './slack-notify';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

function buildMessage(profile) {
  const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || 'there';
  const dept = profile?.department;
  const deptLine = dept
    ? `a quick, hands-on lesson tailored to your ${dept} work`
    : 'a quick, hands-on lesson tailored to your work';
  return [
    `Good morning, ${firstName}! 🌅`,
    '',
    `Your AI Learning Coach pick for today is ready — ${deptLine}.`,
    '',
    `👉 Start today's pick: ${APP_URL}/lesson`,
    '',
    "Even 3 minutes keeps your streak alive — don't let your XP slip. 💪",
  ].join('\n');
}

export async function sendDailyNotifications() {
  const emails = await getNotifyAllowlist();
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const stored = await getUserData(email, 'profile');
    const profile = stored?.data || stored;
    const text = buildMessage(profile);
    const result = await sendSlackDirectMessage(email, text);
    if (result.ok) sent += 1;
    else failed += 1;
    results.push({ email, ok: result.ok, error: result.error || null });
  }

  return { recipients: emails.length, sent, failed, results };
}
