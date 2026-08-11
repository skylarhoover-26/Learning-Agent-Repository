// What today's lesson actually IS, written for the Slack coach's system prompt.
//
// The DM bot could tell you your rank and answer general AI questions, but it had
// no idea what the message it sent you that morning was about: generateSlackReply
// passed only the learner's profile into the chat brain. So "what's today's topic?"
// or "I'm stuck on step 2" got a plausible answer about something else entirely.
//
// Everything here is already sitting in blob by 8:10 AM, when the pre-gen cron
// resolves the pick and generates its plan. This module just reads it and writes
// it down in a form the model can use.
//
// Server-only. Never throws: no context is much better than no reply, so every
// failure degrades to null and the coach answers as it did before.

import { resolveDailyPick } from '@/lib/daily-pick-server';
import { readDailyPickLesson } from '@/lib/daily-pick-lesson';

// Slack replies are 4-6 lines, so the context only needs enough to ground an
// answer: what the topic is, why it was chosen, what the learner will be able to
// do, and roughly how the lesson is shaped.
const MAX_OBJECTIVES = 6;

export async function loadPickContext(profile) {
  if (!profile?.email) return null;
  try {
    const { pick } = await resolveDailyPick(profile);
    if (!pick) return null;

    let plan = null;
    if (pick.topic) {
      const cached = await readDailyPickLesson(profile.email, pick.topic).catch(() => null);
      plan = cached?.plan || null;
    }
    return { pick, plan };
  } catch (error) {
    console.error('loadPickContext failed:', error?.message || error);
    return null;
  }
}

// Render the context as prompt text. Returns null when there's nothing useful to
// say, so the caller can leave the system prompt untouched.
//
// `session` is the learner's in-Slack lesson progress when they have one (Phase 4),
// so "I'm stuck" can be answered about the step they are actually on.
export function formatPickContext({ pick, plan } = {}, session = null, { slackLessonAvailable = false } = {}) {
  if (!pick) return null;
  const lines = ["TODAY'S PICK (this learner's lesson for today — you sent it to them this morning):"];

  if (pick.topic) {
    lines.push(`- Topic: "${pick.topic}"`);
  } else {
    lines.push(`- They have no topic history yet, so today's pick is: "${pick.title || 'their first lesson'}"`);
  }
  if (pick.type) {
    const why = {
      refresh: 'a refresher, because they practiced this a while ago and it is going stale',
      new: 'new to them, chosen to fill a gap in their skills',
      deepen: 'a deeper pass on something they have already started',
      start: 'their very first lesson',
    }[pick.type];
    if (why) lines.push(`- Why this one: ${why}`);
  }
  if (pick.description) lines.push(`- How it was described to them: ${pick.description}`);
  if (plan?.headline) lines.push(`- What the lesson helps them do: ${plan.headline}`);

  const objectives = (plan?.objectives || []).slice(0, MAX_OBJECTIVES).map((o) => o.text).filter(Boolean);
  if (objectives.length) {
    lines.push(`- By the end they should be able to: ${objectives.join('; ')}`);
  }

  const steps = plan?.steps || [];
  if (steps.length) {
    const activities = steps.filter((s) => s.kind === 'activity' || s.kind === 'build').length;
    lines.push(`- Shape: ${steps.length} steps, ${activities} hands-on ${activities === 1 ? 'activity' : 'activities'}.`);
  }

  if (session?.stepIdx != null && steps.length) {
    const current = steps[session.stepIdx];
    lines.push(
      `- THEY ARE PART-WAY THROUGH IT IN SLACK: on step ${session.stepIdx + 1} of ${steps.length}`
      + `${current?.title ? ` ("${current.title}")` : ''}`
      + `${current?.kind === 'activity' ? ', which is an activity they have to pass' : ''}.`,
    );
    if (session.attempts && current?.id && session.attempts[current.id]) {
      lines.push(`- They have already tried that activity ${session.attempts[current.id]} time(s), so they may be genuinely stuck. Help them reason it out; do not just give them the answer.`);
    }
  }

  // Without this the coach confidently tells people the thing they just asked for is
  // impossible — "You can't take the full structured lesson here, but I can coach you
  // through it" was a real reply to "Can I take the lesson here instead?" while the
  // in-Slack flow was already built. The model can't see feature flags, so say it.
  if (slackLessonAvailable && pick.topic) {
    lines.push(
      'THEY CAN TAKE THIS ENTIRE LESSON RIGHT HERE IN SLACK. It is the real lesson, not a'
      + ' summary: the teaching arrives as messages, each hands-on activity opens in a'
      + ' window to fill in, and finishing earns the same XP as doing it in the app.'
      + ' If they ask to take it here, say yes and tell them to tap the *Begin lesson*'
      + ' button below your reply (it is added automatically, so never say there is no'
      + ' button). Never tell them a lesson can only be taken in the app.',
    );
  } else if (pick.topic) {
    lines.push(
      'Taking a lesson inside Slack is switched off right now, so the lesson itself has to'
      + ' happen in the app. You can still explain and coach them through the ideas here.',
    );
  }

  lines.push(
    'Use this when they ask what today\'s topic is, why it was chosen, what they will learn,'
    + ' or when they need help with it. Answer about THIS topic rather than guessing.'
    + ' Never invent lesson content that is not described above.',
  );

  return lines.join('\n');
}

// One call for the common case: profile in, prompt text out (or null).
export async function buildPickContextText(profile, session = null) {
  const context = await loadPickContext(profile);
  if (!context) return null;
  return formatPickContext(context, session);
}

// Blocks for a direct "what is today's pick?" question — a crisp answer with a
// button, rather than a paragraph the model has to compose. Mirrors the DM's
// framing so the two never disagree about what today is.
export function buildPickBlocks({ pick, plan } = {}, appUrl, { slackLessonEnabled = false } = {}) {
  if (!pick) return null;
  const title = pick.topic || pick.title || 'Your next lesson';
  const objectives = (plan?.objectives || []).slice(0, 3).map((o) => `• ${o.text}`).join('\n');
  const body = [
    plan?.headline || pick.description || null,
    objectives ? `\n*By the end you can:*\n${objectives}` : null,
  ].filter(Boolean).join('\n');

  // Mirrors the daily DM: one primary action, and the other surface offered as a
  // sentence underneath rather than a second button competing with it.
  const appHref = `${appUrl}${pick.href || '/daily'}`;
  const canStartInSlack = slackLessonEnabled && Boolean(pick.topic);

  const elements = canStartInSlack
    ? [{
        type: 'button',
        text: { type: 'plain_text', text: 'Begin lesson' },
        action_id: 'daily_start_in_slack',
        value: JSON.stringify({ topic: pick.topic }).slice(0, 2000),
        style: 'primary',
      }]
    : [{
        type: 'button',
        text: { type: 'plain_text', text: (pick.cta || 'Start lesson').slice(0, 75) },
        url: appHref,
        action_id: 'pick_open_app',
        style: 'primary',
      }];

  return [
    { type: 'header', text: { type: 'plain_text', text: `🎯 Today: ${title}`.slice(0, 150) } },
    ...(body ? [{ type: 'section', text: { type: 'mrkdwn', text: body.slice(0, 2900) } }] : []),
    { type: 'actions', elements },
    ...(canStartInSlack
      ? [{
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Prefer to take this in the app? <${appHref}|Open it there instead>.` }],
        }]
      : []),
  ];
}
