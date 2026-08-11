// Slack interactivity dispatch: button presses and modal submissions.
//
// Until now app/api/slack/route.js acked any interactivity payload with an empty 200
// and did nothing with it — fine when the only buttons were links (Slack fires an
// interaction even for those), and the reason no in-Slack flow could exist. This is
// the router that makes buttons mean something.
//
// Timing rules that shape everything here:
//   - Slack needs a response to the HTTP request within 3 seconds, so the route acks
//     immediately and calls into this from `after()`.
//   - A trigger_id (needed to open a modal) is only valid for a few seconds, so the
//     modal path does the least possible work before calling views.open, and reports
//     a failure to the learner instead of leaving a button that did nothing.
//
// Server-only.

import { lookupSlackEmailByUserId, postSlackMessage } from '@/lib/slack-notify';
import { isSlackLessonEnabled } from '@/lib/slack-lesson-config';
import { readSession } from '@/lib/slack-lesson-session';
import { logSlackMessage } from '@/lib/slack-conversation-store';
import { logAuditEntry } from '@/lib/audit-log';
import {
  ACTION, ACTIVITY_CALLBACK,
  startSlackLesson, continueSlackLesson, openSlackActivity,
  submitSlackActivity, finishSlackLesson, quitSlackLesson, postCurrentStep,
} from '@/lib/slack-lesson';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

// The action_ids we own. Anything else (link buttons on the Home tab, the "open in
// app" buttons) is a no-op by design: Slack fires an interaction for those too.
const HANDLED = new Set(Object.values(ACTION));

export function isHandledAction(actionId) {
  return HANDLED.has(actionId);
}

function parseValue(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { value: raw };
  } catch {
    return { value: raw };
  }
}

// Where a button press happened. Buttons inside a DM carry the channel on the
// container; a button inside a modal has none, in which case the session's stored
// channel is the fallback.
function channelOf(payload) {
  return payload?.channel?.id || payload?.container?.channel_id || null;
}

// Durable trace of a button press. Console logging alone was not enough: a press
// that returned early looked identical to a press that never arrived, which made
// "Begin lesson does nothing" impossible to diagnose from the outside.
async function trace(stage, detail = {}) {
  await logAuditEntry({
    type: 'slack_interaction',
    endpoint: '/api/slack',
    user: { email: detail.email || 'unknown', name: 'slack-interaction' },
    model: 'n/a',
    input: { stage, ...detail },
    output: { stage },
    durationMs: detail.durationMs || 0,
  }).catch((error) => console.error(`trace write failed (${stage}):`, error?.message || error));
}

async function handleBlockAction(payload) {
  const action = (payload.actions || [])[0];
  await trace('received', {
    actionId: action?.action_id || null,
    handled: Boolean(action && isHandledAction(action.action_id)),
    slackUserId: payload.user?.id || null,
    channel: channelOf(payload),
  });
  if (!action || !isHandledAction(action.action_id)) return;

  const { email } = await lookupSlackEmailByUserId(payload.user?.id);
  const channel = channelOf(payload);

  if (!email) {
    await trace('no_email', { slackUserId: payload.user?.id || null, channel });
    if (channel) {
      await postSlackMessage(channel, 'Sign in to the app first.', [{
        type: 'section',
        text: { type: 'mrkdwn', text: `I couldn't match your Slack account to an app login. <${APP_URL}|Sign in once> and this will work.` },
      }]);
    }
    return;
  }

  // Every lesson action is gated, so turning the flag off mid-rollout stops the flow
  // rather than leaving live buttons behind in old messages.
  const enabled = await isSlackLessonEnabled().catch(() => false);
  await trace('flag_checked', { email, enabled, channel });
  if (!enabled) {
    await postSlackMessage(channel, 'Lessons in Slack are off right now.', [{
      type: 'section',
      text: { type: 'mrkdwn', text: `Taking lessons inside Slack is switched off right now. <${APP_URL}/daily|Take today's pick in the app →>` },
    }]);
    return;
  }

  await logSlackMessage({
    email,
    slackUserId: payload.user?.id,
    direction: 'inbound',
    channel,
    text: `[button] ${action.action_id}`,
    meta: { source: 'slack_lesson_action', action: action.action_id },
  }).catch(() => {});

  const value = parseValue(action.value);
  const startedAt = Date.now();
  await trace('dispatching', { email, action: action.action_id, channel, value: JSON.stringify(value).slice(0, 200) });

  try {
    await dispatch({ action, value, email, channel, payload });
    await trace('completed', { email, action: action.action_id, durationMs: Date.now() - startedAt });
  } catch (error) {
    await trace('threw', { email, action: action.action_id, error: error?.message || String(error), durationMs: Date.now() - startedAt });
    throw error;
  }
}

// The actual dispatch, split out so the tracing above wraps every branch.
async function dispatch({ action, value, email, channel, payload }) {
  switch (action.action_id) {
    case ACTION.START: {
      const topic = value.topic || value.value;
      if (!topic) return;
      // A second press of the same button (or the button in yesterday's DM re-pressed
      // today) shouldn't restart a lesson in progress — re-post where they are.
      const existing = await readSession(email);
      if (existing?.plan && existing.topic === topic && !existing.finishedAt) {
        await postCurrentStep({ email, session: existing, channel });
        return;
      }
      await startSlackLesson({ email, channel, topic });
      return;
    }
    case ACTION.CONTINUE:
      await continueSlackLesson({ email, stepId: value.value || action.value });
      return;
    case ACTION.ACTIVITY:
      await openSlackActivity({
        email,
        stepId: value.value || action.value,
        triggerId: payload.trigger_id,
        channel,
      });
      return;
    case ACTION.FINISH:
      await finishSlackLesson({ email });
      return;
    case ACTION.QUIT:
      await quitSlackLesson({ email });
      return;
    default:
  }
}

async function handleViewSubmission(payload) {
  if (payload.view?.callback_id !== ACTIVITY_CALLBACK) return;
  const { email } = await lookupSlackEmailByUserId(payload.user?.id);
  if (!email) return;
  await submitSlackActivity({ email, view: payload.view });
}

// Entry point. Never throws: an unhandled error here would otherwise surface to the
// learner as a frozen modal or a dead button.
export async function handleSlackInteraction(payload) {
  try {
    if (payload?.type === 'block_actions') return await handleBlockAction(payload);
    if (payload?.type === 'view_submission') return await handleViewSubmission(payload);
  } catch (error) {
    console.error('Slack interaction handler failed:', error);
    // Best-effort apology so a failure isn't silent.
    const channel = channelOf(payload);
    if (channel) {
      await postSlackMessage(channel, 'Something went wrong.', [{
        type: 'section',
        text: { type: 'mrkdwn', text: `Something went wrong on my end. <${APP_URL}/daily|Pick it up in the app →>` },
      }]).catch(() => {});
    }
  }
}
