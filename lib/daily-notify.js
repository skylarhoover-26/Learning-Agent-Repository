// Shared daily-notification logic, used by both the secret-protected public
// endpoint (n8n) and the admin "Send now" test route.

import { getNotifyAllowlist } from './notify-allowlist';
import { getUserData, saveUserData } from './blob-store';
import { sendSlackDirectMessage } from './slack-notify';
import { logSlackMessage } from './slack-conversation-store';
import { contentDayKey } from './content-day';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

const SYSTEM_ID = '__system__';
const SEND_LOG = 'daily_pick_send_log';
const SEND_LOG_MAX = 30;

// The rolling history of daily-pick sends, newest-first, for the admin "Recent
// sends" pulse check. Each entry: { at, date, trigger, recipients, sent, failed }.
export async function getDailySendLog() {
  try {
    const stored = await getUserData(SYSTEM_ID, SEND_LOG);
    const entries = stored?.entries || stored?.data?.entries;
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error('getDailySendLog failed:', error);
    return [];
  }
}

async function recordDailySend(entry) {
  try {
    const log = await getDailySendLog();
    const entries = [entry, ...log].slice(0, SEND_LOG_MAX);
    await saveUserData(SYSTEM_ID, SEND_LOG, { entries, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('recordDailySend failed:', error);
  }
}

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
    // /daily lands the learner on today's actual personalized pick.
    `👉 Start today's pick: ${APP_URL}/daily`,
    '',
    "Even 3 minutes keeps your streak alive — don't let your XP slip. 💪",
    '',
    'Have a question? Just reply here and I can help. 💬',
  ].join('\n');
}

// `trigger` records how the send was fired ('cron' | 'manual' | 'n8n') so the
// admin pulse view can tell an automated weekday send from a manual test.
export async function sendDailyNotifications(trigger = 'manual') {
  const emails = await getNotifyAllowlist();
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const stored = await getUserData(email, 'profile');
    const profile = stored?.data || stored;
    const text = buildMessage(profile);
    const result = await sendSlackDirectMessage(email, text);
    if (result.ok) {
      sent += 1;
      // Log the push so it shows in the admin conversation monitor alongside
      // any back-and-forth the learner has with the bot.
      await logSlackMessage({
        email,
        direction: 'outbound',
        text,
        meta: { source: 'daily_pick' },
      });
    } else {
      failed += 1;
    }
    results.push({ email, ok: result.ok, error: result.error || null });
  }

  await recordDailySend({
    at: new Date().toISOString(),
    date: contentDayKey(),
    trigger,
    recipients: emails.length,
    sent,
    failed,
  });

  return { recipients: emails.length, sent, failed, results };
}
