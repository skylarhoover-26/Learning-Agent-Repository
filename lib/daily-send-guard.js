// The claim-the-day guard around the daily Slack send, plus durable instrumentation.
//
// Why this exists as its own module: three weekday sends went missing (Mon Jul 27,
// Mon Aug 3, Mon Aug 10, plus a scattered Thu Aug 6) and there was NO WAY to tell
// what happened. The only record of a send is `daily_pick_send_log`, which is written
// AFTER delivery — so a run that never fired, a run that was correctly skipped, and a
// run that died mid-send all look identical afterwards: an absent row.
//
// So every outcome is now recorded to the audit log the moment it's known:
//   entered  — the route was actually invoked (this alone distinguishes "Vercel never
//              called us" from "we ran and something went wrong", which was the whole
//              unanswerable question)
//   skipped  — the day was already claimed, with the claiming timestamp
//   sent     — how many went out, and how many failed
//   failed   — threw, with the message
//
// The day is claimed BEFORE sending so two triggers can't double-DM anyone. That
// means a crash mid-send burns the day, which is deliberate: a partial double-send is
// worse than a missed nudge. The catch-up cron exists for the other failure mode.

import { getUserData, saveUserData } from '@/lib/blob-store';
import { contentDayKey } from '@/lib/content-day';
import { logAuditEntry } from '@/lib/audit-log';
import { sendDailyNotifications } from '@/lib/daily-notify';

const SYSTEM_ID = '__system__';
const SENT_MARKER = 'daily_pick_last_sent';

// Audit `type` for every cron-send lifecycle event. Listed in ACTIVITY_SKIP
// (lib/activity-labels.js) so it stays out of the learner-activity chart — it's
// operational telemetry, not something a person did.
export const CRON_AUDIT_TYPE = 'cron_daily_pick';

async function record(stage, trigger, detail = {}) {
  await logAuditEntry({
    type: CRON_AUDIT_TYPE,
    endpoint: '/api/cron/daily-pick',
    user: { email: 'system', name: `cron:${trigger}` },
    model: 'n/a',
    input: { stage, trigger, date: contentDayKey(), ...detail },
    output: { stage },
    durationMs: detail.durationMs || 0,
  }).catch((error) => {
    // Instrumentation must never break the thing it's instrumenting.
    console.error(`daily-send audit write failed (${stage}):`, error?.message || error);
  });
}

// Read the marker for today. Returns { claimed, claimedAt }.
async function readClaim() {
  const marker = await getUserData(SYSTEM_ID, SENT_MARKER);
  const date = marker?.date || marker?.data?.date;
  const at = marker?.at || marker?.data?.at || null;
  return { claimed: date === contentDayKey(), claimedAt: at };
}

// Run the daily send at most once per content-day.
//
// `trigger` names the caller ('cron' | 'catchup' | 'n8n'). Returns the same shape the
// routes respond with, plus `stage` so a human reading the response knows whether
// anything was actually sent.
export async function claimDayAndSend(trigger) {
  const today = contentDayKey();
  const startedAt = Date.now();

  // Logged before anything can go wrong, because "were we even invoked?" is the
  // question that was impossible to answer.
  await record('entered', trigger);

  try {
    const { claimed, claimedAt } = await readClaim();
    if (claimed) {
      await record('skipped', trigger, { reason: 'already_sent_today', claimedAt });
      return { ok: true, stage: 'skipped', skipped: 'already_sent_today', date: today, claimedAt };
    }

    // Claim first: a near-simultaneous second trigger must not also send.
    await saveUserData(SYSTEM_ID, SENT_MARKER, { date: today, at: new Date().toISOString(), trigger });

    const summary = await sendDailyNotifications(trigger);
    await record('sent', trigger, {
      recipients: summary.recipients,
      sent: summary.sent,
      failed: summary.failed,
      logged: summary.logged,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, stage: 'sent', date: today, ...summary };
  } catch (error) {
    // The day stays claimed on purpose (see the header note on partial sends), but at
    // least the failure is now visible instead of looking like a run that never was.
    await record('failed', trigger, {
      error: error?.message || String(error),
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

// Whether today's send has already happened — used by the catch-up route to report
// what it found without duplicating marker knowledge.
export async function isDayClaimed() {
  const { claimed } = await readClaim();
  return claimed;
}
