// Shared daily-notification logic, used by both the secret-protected public
// endpoint (n8n) and the admin "Send now" test route.

import { getNotifyAllowlist } from './notify-allowlist';
import { getUserData, saveUserData } from './blob-store';
import { sendSlackDirectMessage } from './slack-notify';
import { logSlackMessage } from './slack-conversation-store';
import { contentDayKey } from './content-day';
import { resolveDailyPick } from './daily-pick-server';
import { buildDailyMessage, firstNameOf } from './daily-message';
import { generateDailyNudge } from './daily-message-ai';
import { readStanding } from './progression-server';
import { isSlackLessonEnabled } from './slack-lesson-config';
import { resolveLearnerId } from './learner-id';

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

// Append an entry to the rolling send log. Returns whether it actually landed.
//
// This runs AFTER the DMs go out, so a failure here means the messages were
// delivered but this send is invisible in the admin "Recent sends" pulse check —
// which is the one place an admin looks to confirm a weekday send fired. It used
// to swallow the error to console only, so the screen would quietly show a stale
// "last sent" date while delivery was perfectly healthy. Report it instead: the
// caller surfaces `logged` so the failure is visible rather than inferred.
//
// Known remaining issue: this is a read-modify-write on one blob key, the same
// lost-update pattern lib/audit-log.js was refactored away from (per-entry blobs).
// With one send per content-day concurrent writes are unlikely, so it hasn't been
// worth the storage change — but two simultaneous sends can still lose an entry.
async function recordDailySend(entry) {
  try {
    const log = await getDailySendLog();
    const entries = [entry, ...log].slice(0, SEND_LOG_MAX);
    await saveUserData(SYSTEM_ID, SEND_LOG, { entries, updated_at: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error(
      `recordDailySend FAILED — ${entry.sent}/${entry.recipients} DMs were sent (trigger=${entry.trigger}) but will NOT appear in Recent sends:`,
      error,
    );
    return false;
  }
}

// Copy is assembled in lib/daily-message.js from three sources: a model writes the
// greeting and the reason (lib/daily-message-ai.js, fresh per send), code writes the
// facts (topic, streak, level, XP, buttons), and a handwritten pool covers the model
// failing. The message used to be one hardcoded template repeated every morning.
//
// `startPath` is the app path the "Take it in the app" button points at. Prefer
// the resolved lesson URL: /daily is a pass-through that has to look the pick up
// in the browser before forwarding, which flashed a "Finding today's pick…" screen
// on the way through (feedback #138). Linking straight to the lesson removes that
// hop entirely. Falls back to /daily when the pick can't be resolved server-side,
// which is still correct — just with the old redirect.

// `trigger` records how the send was fired ('cron' | 'manual' | 'n8n') so the
// admin pulse view can tell an automated weekday send from a manual test.
export async function sendDailyNotifications(trigger = 'manual') {
  const emails = await getNotifyAllowlist();
  const results = [];
  let sent = 0;
  let failed = 0;

  // One read for the whole send rather than one per recipient.
  const slackLessonEnabled = await isSlackLessonEnabled().catch(() => false);

  for (const email of emails) {
    const stored = await getUserData(email, 'profile');
    const profile = { ...(stored?.data || stored || {}), email };
    // Resolve the pick here so the DM can name the actual topic and deep-link to
    // the lesson instead of bouncing through /daily. Best-effort: a failure here
    // must never stop the nudge going out, so fall back to the /daily redirect.
    // The pick and the standing are independent reads, so they run together —
    // this loop is sequential per recipient (Slack rate limits), and the work per
    // person grew when the message started carrying the real streak.
    const [pickResult, standingResult] = await Promise.allSettled([
      resolveDailyPick(profile),
      readStanding(email, resolveLearnerId(profile)),
    ]);

    let startPath = '/daily';
    let pick = null;
    if (pickResult.status === 'fulfilled') {
      // resolveDailyPick returns { pick, date, cached } — the href is on .pick,
      // not the wrapper. Reading it off the wrapper silently yields undefined and
      // falls back to /daily forever, which looks like the feature working.
      pick = pickResult.value?.pick || null;
      if (pick?.href) startPath = pick.href;
    } else {
      console.error(`resolveDailyPick failed for ${email}, linking to /daily:`, pickResult.reason?.message);
    }
    // Streak/level/XP became readable server-side with progression-server; a
    // failure just drops the standing line rather than the whole message.
    const standing = standingResult.status === 'fulfilled' ? standingResult.value : null;
    if (standingResult.status === 'rejected') {
      console.error(`readStanding failed for ${email}, omitting standing:`, standingResult.reason?.message);
    }

    // Written fresh per send so the copy differs every time, and so the reason line
    // can say something true about THIS topic instead of the pick's generic
    // description. Best-effort: null falls back to the handwritten pool.
    const aiCopy = await generateDailyNudge({
      profile,
      pick,
      firstName: firstNameOf(profile),
    }).catch(() => null);

    const { blocks, text } = buildDailyMessage({
      profile,
      pick,
      standing,
      appUrl: APP_URL,
      startPath,
      slackLessonEnabled,
      aiCopy,
    });
    const result = await sendSlackDirectMessage(email, text, blocks);
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

  const logged = await recordDailySend({
    at: new Date().toISOString(),
    date: contentDayKey(),
    trigger,
    recipients: emails.length,
    sent,
    failed,
  });

  // `logged: false` means the DMs went out but Recent sends won't show them, so
  // an absent row there is not evidence a send didn't happen.
  return { recipients: emails.length, sent, failed, logged, results };
}
