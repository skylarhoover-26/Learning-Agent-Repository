// Taking a lesson inside Slack: the same plan, the same activities, the same XP.
//
// The web player (components/plan-lesson-player.jsx) walks a generated plan of
// teach and activity steps, requires every activity to settle before moving on, and
// finishes by handing a correctness fraction to the shared rule engine. This is that
// flow expressed in a DM: teach steps arrive as messages with a Continue button,
// activities open a modal, and completion calls the same rule engine through
// progression-server so a lesson finished here earns exactly what it earns in the app.
//
// Everything is driven from the session (lib/slack-lesson-session.js), because Slack
// hands us nothing but a user id and a button value on each press.
//
// Server-only. Every entry point is called from `after()` in the route, so slow AI
// work never blocks Slack's 3-second ack.

import { getUserData } from '@/lib/blob-store';
import { resolveLearnerId } from '@/lib/learner-id';
import { generateLessonPlan, generateTeachStep } from '@/lib/ai';
import { readDailyPickLesson } from '@/lib/daily-pick-lesson';
import { postSlackMessage, openSlackModal } from '@/lib/slack-notify';
import { logSlackMessage } from '@/lib/slack-conversation-store';
import { logAuditEntry } from '@/lib/audit-log';
import { awardLessonComplete } from '@/lib/progression-server';
import { badgeMeta } from '@/lib/badges';
import { getLevelTitle } from '@/lib/level-titles';
import { toMrkdwn, mrkdwnSections, clamp } from '@/lib/slack-mrkdwn';
import {
  activityInputBlocks, readSubmission, gradeActivity, MAX_ATTEMPTS,
} from '@/lib/slack-activity-blocks';
import {
  readSession, writeSession, newSession, clearSession,
  sessionSteps, currentStep, correctnessOf, quizCorrectOf, isLastStep,
} from '@/lib/slack-lesson-session';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';
// Today's Pick opens as a standard Quick Lesson everywhere else, so Slack matches.
const FORMAT = 'standard';

export const ACTION = {
  START: 'daily_start_in_slack',
  CONTINUE: 'lesson_continue',
  ACTIVITY: 'lesson_activity',
  FINISH: 'lesson_finish',
  QUIT: 'lesson_quit',
};
export const ACTIVITY_CALLBACK = 'slack_activity_submit';

async function loadProfile(email) {
  const stored = await getUserData(email, 'profile').catch(() => null);
  return { ...(stored?.data || stored || {}), email };
}

// Every message this flow sends goes through here so a REJECTED post leaves a
// durable trace. Learned the hard way: the lesson flow was writing sessions to blob
// while none of its messages arrived, and because postSlackMessage only warns to
// console there was no way to see which post failed or what Slack said about it.
// `stage` names the step of the flow, so the audit log reads as a trail.
async function post(email, channel, stage, text, blocks = null) {
  const result = await postSlackMessage(channel, text, blocks);
  if (!result.ok) {
    console.error(`slack-lesson post failed [${stage}] channel=${channel}:`, result.error);
    await logAuditEntry({
      type: 'slack_lesson_post_failed',
      endpoint: '/api/slack',
      user: { email: email || 'unknown', name: 'slack-lesson' },
      model: 'n/a',
      input: { stage, channel, error: result.error, blockCount: blocks?.length ?? 0 },
      output: { ok: false },
      durationMs: 0,
    }).catch(() => {});
  }
  return result;
}

function button(text, actionId, value, style) {
  const el = {
    type: 'button',
    text: { type: 'plain_text', text: clamp(text, 75) },
    action_id: actionId,
    value: String(value ?? ''),
  };
  return style ? { ...el, style } : el;
}

// A `build` step (Project Quests) is hands-on work judged on a brief, which is
// exactly a "write" activity with different field names. Normalizing here keeps
// slack-activity-blocks purely type-driven.
function asActivityStep(step) {
  if (step?.kind !== 'build') return step;
  return {
    ...step,
    activityType: 'write',
    activity: {
      instructions: step.build?.brief,
      gradingCriteria: step.build?.reviewFocus,
      placeholder: step.build?.deliverableName ? `Your ${step.build.deliverableName}…` : undefined,
      passScore: 70,
    },
  };
}

function progressContext(session) {
  const steps = sessionSteps(session);
  return {
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `${session.topic}  ·  Step ${(session.stepIdx ?? 0) + 1} of ${steps.length}`,
    }],
  };
}

// ── Rendering one step ───────────────────────────────────────────────────────

// Blocks for the current step. Generates teach content on demand and caches it in
// the session, so a Continue press never regenerates what was already shown.
async function renderStep(email, session, profile) {
  const step = currentStep(session);
  if (!step) return null;
  const steps = sessionSteps(session);

  if (step.kind === 'teach') {
    let content = session.teach?.[step.id];
    if (!content?.message) {
      const nextStep = steps[session.stepIdx + 1];
      const nextActivity = nextStep && (nextStep.kind === 'activity' || nextStep.kind === 'build') ? nextStep : null;
      const priorContent = steps
        .slice(0, session.stepIdx)
        .map((s) => session.teach?.[s.id])
        .filter((c) => c?.message)
        .map((c, i) => ({ title: steps[i]?.title, message: c.message }));
      const generated = await generateTeachStep(session.topic, profile, {
        step,
        objectives: session.plan?.objectives || [],
        priorTitles: steps.slice(0, session.stepIdx).map((s) => s.title).filter(Boolean),
        priorContent,
        upcoming: nextActivity
          ? {
              activityType: nextActivity.activityType || 'exercise',
              objective: (session.plan?.objectives || []).find((o) => o.id === nextActivity.objectiveId)?.text || '',
            }
          : null,
        format: session.format || FORMAT,
        // Chat-sized prose, no clickable blocks. See generateTeachStep's `concise`.
        concise: true,
      });
      content = { message: generated.message, keyPoints: generated.keyPoints || [], blocks: generated.blocks || [] };
      session.teach = { ...(session.teach || {}), [step.id]: content };
      await writeSession(email, session);
    }

    // Interactive teach blocks are NOT rendered. Flattening them into text looked
    // like a way to preserve the teaching, but in practice they restate the prose
    // that precedes them (they're optional depth you click into on the web), and
    // they were 57% of a 2,900-character step message. Concise generation stops
    // producing them; this also drops any that arrive from a cached web-length step.
    const keyPoints = (content.keyPoints || []).length
      ? `*Worth remembering*\n${content.keyPoints.slice(0, 2).map((k) => `• ${k}`).join('\n')}`
      : null;

    return [
      { type: 'header', text: { type: 'plain_text', text: clamp(step.title || 'Lesson', 150) } },
      ...mrkdwnSections(content.message),
      ...(keyPoints ? mrkdwnSections(keyPoints) : []),
      {
        type: 'actions',
        elements: [
          button(isLastStep(session) ? 'Finish' : 'Continue', ACTION.CONTINUE, step.id, 'primary'),
          button('Stop for now', ACTION.QUIT, step.id),
        ],
      },
      progressContext(session),
    ];
  }

  if (step.kind === 'activity' || step.kind === 'build') {
    const normalized = asActivityStep(step);
    const attempts = session.attempts?.[step.id] || 0;
    const settled = session.resolved?.[step.id] !== undefined;
    const objective = (session.plan?.objectives || []).find((o) => o.id === step.objectiveId)?.text;
    return [
      { type: 'header', text: { type: 'plain_text', text: clamp(step.title || 'Your turn', 150) } },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            'Time to try it.',
            objective ? `_This one checks: ${objective}_` : null,
            attempts ? `You've used ${attempts} of ${MAX_ATTEMPTS} tries.` : null,
          ].filter(Boolean).join('\n'),
        },
      },
      {
        type: 'actions',
        elements: [
          settled
            ? button(isLastStep(session) ? 'Finish' : 'Continue', ACTION.CONTINUE, step.id, 'primary')
            : button(attempts ? 'Try again' : `Start activity (${normalized.activityType})`, ACTION.ACTIVITY, step.id, 'primary'),
          button('Stop for now', ACTION.QUIT, step.id),
        ],
      },
      progressContext(session),
    ];
  }

  // recap (always the last step in a generated plan)
  const objectives = (session.plan?.objectives || []).map((o) => `• ${o.text}`).join('\n');
  return [
    { type: 'header', text: { type: 'plain_text', text: 'Recap' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [`*${session.topic}*`, objectives ? `\nWhat you covered:\n${objectives}` : null].filter(Boolean).join('\n'),
      },
    },
    {
      type: 'actions',
      elements: [button('Finish and collect XP', ACTION.FINISH, session.topic, 'primary')],
    },
    progressContext(session),
  ];
}

async function postStep(email, session, profile) {
  const blocks = await renderStep(email, session, profile);
  if (!blocks) return;
  const step = currentStep(session);
  const text = `${session.topic} — step ${(session.stepIdx ?? 0) + 1}: ${step?.title || ''}`;
  await post(email, session.channel, 'step', text, blocks);
  await logSlackMessage({
    email,
    direction: 'outbound',
    channel: session.channel,
    text,
    meta: { source: 'slack_lesson', step: step?.id, kind: step?.kind, topic: session.topic },
  }).catch(() => {});
}

// ── Entry points ─────────────────────────────────────────────────────────────

// Start (or restart) today's pick in Slack. Uses the pre-generated plan when the
// pre-gen cron has one (the normal case at 9:30 AM), and generates one otherwise —
// which is slow, hence the "building" message first.
export async function startSlackLesson({ email, channel, topic }) {
  if (!email || !channel || !topic) return;
  const profile = await loadProfile(email);

  const cached = await readDailyPickLesson(email, topic).catch(() => null);
  let plan = cached?.plan || null;

  if (!plan) {
    await post(email, channel, 'building', 'Building your lesson. This takes up to a minute.', [
      { type: 'section', text: { type: 'mrkdwn', text: `🛠️ Building your lesson on *${topic}*. This takes up to a minute, I'll post the first step here.` } },
    ]);
    plan = await generateLessonPlan(topic, profile, { format: FORMAT }).catch((error) => {
      console.error('startSlackLesson plan generation failed:', error?.message || error);
      return null;
    });
  }

  if (!plan?.steps?.length) {
    await post(email, channel, 'plan_failed', "I couldn't build that lesson.", [{
      type: 'section',
      text: { type: 'mrkdwn', text: `I couldn't build that lesson just now. <${APP_URL}/daily|Open it in the app> instead and it'll work there.` },
    }]);
    return;
  }

  const session = newSession({ topic, format: FORMAT, plan, channel, toolIds: cached?.toolIds || null });
  // The cached PLAN is reused (it's the expensive part, 60-120s, and identical for
  // both surfaces) but its cached TEACH content is deliberately NOT read: that was
  // written at web length for a page. Slack regenerates each step concisely instead,
  // which costs ~10s on the first step and is the difference between a readable DM
  // and a wall of text.
  await writeSession(email, session);

  const intro = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${topic}*\n${plan.headline ? toMrkdwn(plan.headline) : "Let's get into it."}` } },
    ...((plan.objectives || []).length
      ? [{ type: 'section', text: { type: 'mrkdwn', text: `*By the end you can:*\n${plan.objectives.map((o) => `• ${o.text}`).join('\n')}` } }]
      : []),
    { type: 'context', elements: [{ type: 'mrkdwn', text: `${plan.steps.length} steps. You can stop any time and finish in the app.` }] },
  ];
  await post(email, channel, 'intro', `Starting: ${topic}`, intro);
  await logAuditEntry({
    type: 'lesson_start',
    endpoint: '/api/slack',
    user: { email, name: profile.display_name || email },
    model: 'n/a',
    input: { topic, format: FORMAT, source: 'slack', preGenerated: Boolean(cached?.plan) },
    output: { steps: plan.steps.length },
    durationMs: 0,
  }).catch(() => {});

  await postStep(email, session, profile);
}

// Continue past the current step. `stepId` is the step the BUTTON was rendered for,
// which is how a double-click is ignored: the second press no longer matches.
export async function continueSlackLesson({ email, stepId }) {
  const session = await readSession(email);
  if (!session?.plan) return;
  const step = currentStep(session);
  if (!step || (stepId && step.id !== stepId)) return;

  if (isLastStep(session)) {
    await finishSlackLesson({ email });
    return;
  }
  session.stepIdx = (session.stepIdx || 0) + 1;
  await writeSession(email, session);
  const profile = await loadProfile(email);
  await postStep(email, session, profile);
}

// Open the activity modal. Must be fast: Slack invalidates a trigger_id after ~3
// seconds, so this only reads the session and renders from plan data already held —
// no generation, no model calls.
export async function openSlackActivity({ email, stepId, triggerId, channel = null }) {
  const session = await readSession(email);
  if (!session?.plan || !triggerId) return;
  // The press may have come from a different DM channel than the one stored (rare,
  // but a re-opened DM gets a new id), so keep the session pointing at where the
  // learner actually is.
  if (channel && session.channel !== channel) session.channel = channel;
  const step = sessionSteps(session).find((s) => s.id === stepId);
  if (!step) return;

  const normalized = asActivityStep(step);
  const blocks = activityInputBlocks(normalized);
  if (!blocks) {
    // Unrenderable activity: don't trap the learner behind a modal that can't open.
    session.resolved = { ...(session.resolved || {}), [step.id]: true };
    await writeSession(email, session);
    await post(email, session.channel, 'skip_activity', 'Skipping that one.', [{
      type: 'section',
      text: { type: 'mrkdwn', text: "That activity doesn't fit in Slack, so I'm marking it done. Continue below." },
    }, {
      type: 'actions',
      elements: [button(isLastStep(session) ? 'Finish' : 'Continue', ACTION.CONTINUE, step.id, 'primary')],
    }]);
    return;
  }

  const attempts = session.attempts?.[step.id] || 0;
  const opened = await openSlackModal(triggerId, {
    type: 'modal',
    callback_id: ACTIVITY_CALLBACK,
    // Slack caps modal titles at 24 characters and rejects the view if it's longer.
    title: { type: 'plain_text', text: clamp(step.title || 'Activity', 24) },
    submit: { type: 'plain_text', text: 'Submit' },
    close: { type: 'plain_text', text: 'Back' },
    private_metadata: JSON.stringify({ stepId: step.id, topic: session.topic }).slice(0, 3000),
    blocks: [
      ...blocks,
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `Try ${attempts + 1} of ${MAX_ATTEMPTS}` }],
      },
    ],
  });

  // A trigger_id expires within a few seconds, and a rejected view leaves NOTHING on
  // screen — identical to a broken button from the learner's side. Say so, and give
  // them the button again. This does not consume an attempt.
  if (!opened.ok) {
    console.error(`openSlackActivity: views.open failed (${opened.error}) for ${step.id}`);
    await post(email, session.channel, 'modal_open_failed', "That didn't open.", [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: opened.error === 'expired_trigger_id'
            ? "That took a moment too long to open, which Slack won't allow. Tap it again and it should come straight up."
            : "I couldn't open that activity. Tap it again, or take the lesson in the app.",
        },
      },
      {
        type: 'actions',
        elements: [
          button('Try again', ACTION.ACTIVITY, step.id, 'primary'),
          { type: 'button', text: { type: 'plain_text', text: 'Open in the app' }, url: `${APP_URL}/daily`, action_id: 'activity_open_app' },
        ],
      },
    ]);
  }
}

// Re-post the step the learner is currently on. Used when they press Start again on a
// lesson that's already in progress: restarting would throw away their passed
// activities, so show them where they actually are instead.
export async function postCurrentStep({ email, session, channel = null }) {
  if (!session?.plan) return;
  if (channel && session.channel !== channel) {
    session.channel = channel;
    await writeSession(email, session);
  }
  const profile = await loadProfile(email);
  await post(email, session.channel, 'resume', 'Picking up where you left off.', [{
    type: 'section',
    text: { type: 'mrkdwn', text: `You're already part-way through *${session.topic}*. Here's where you left off.` },
  }]);
  await postStep(email, session, profile);
}

// Grade a submitted activity, record it, and post the result with the next action.
// Called from `after()` because "write" grading is a model call.
export async function submitSlackActivity({ email, view }) {
  const session = await readSession(email);
  if (!session?.plan) return;
  let meta = {};
  try { meta = JSON.parse(view?.private_metadata || '{}'); } catch { /* fall through */ }
  const step = sessionSteps(session).find((s) => s.id === meta.stepId);
  if (!step) return;

  const normalized = asActivityStep(step);
  const submission = readSubmission(view);
  const attemptNumber = (session.attempts?.[step.id] || 0) + 1;
  const { passed, feedback, score } = await gradeActivity(normalized, submission, { attemptNumber });

  session.attempts = { ...(session.attempts || {}), [step.id]: attemptNumber };
  if (score !== undefined) {
    session.scores = { ...(session.scores || {}), [step.id]: Math.max(score, session.scores?.[step.id] || 0) };
  }
  // Settle on a pass, or once the attempts are gone — same rule as the web player,
  // so a learner is never stuck on one activity forever.
  const settled = passed || attemptNumber >= MAX_ATTEMPTS;
  if (settled) {
    session.resolved = { ...(session.resolved || {}), [step.id]: passed };
  }
  await writeSession(email, session);

  const triesLeft = MAX_ATTEMPTS - attemptNumber;
  const elements = settled
    ? [button(isLastStep(session) ? 'Finish' : 'Continue', ACTION.CONTINUE, step.id, 'primary')]
    : [button(`Try again (${triesLeft} left)`, ACTION.ACTIVITY, step.id, 'primary'),
       button('Stop for now', ACTION.QUIT, step.id)];

  const tail = settled && !passed
    ? "\n\nThat's your last try on this one, so I'm moving you on. It still counts toward finishing."
    : '';

  await post(email, session.channel, 'grade_result', passed ? 'Correct.' : 'Not quite.', [
    { type: 'section', text: { type: 'mrkdwn', text: clamp(`${feedback}${tail}`, 2900) } },
    { type: 'actions', elements },
  ]);

  await logAuditEntry({
    type: 'grade',
    endpoint: '/api/slack',
    user: { email, name: email },
    model: normalized.activityType === 'write' ? 'haiku' : 'deterministic',
    input: { topic: session.topic, step: step.id, activityType: normalized.activityType, attempt: attemptNumber, source: 'slack' },
    output: { passed, score: score ?? null },
    durationMs: 0,
  }).catch(() => {});
  await logSlackMessage({
    email,
    direction: 'outbound',
    channel: session.channel,
    text: `Activity ${step.id}: ${passed ? 'passed' : 'not passed'} (attempt ${attemptNumber})`,
    meta: { source: 'slack_lesson_grade', step: step.id, passed, score: score ?? null },
  }).catch(() => {});
}

// Abandon the lesson. Progress is dropped rather than kept: the session is scoped to
// one content-day, and a half-finished Slack lesson resumed days later would be more
// confusing than starting clean.
export async function quitSlackLesson({ email }) {
  const session = await readSession(email);
  if (!session) return;
  await clearSession(email);
  await post(email, session.channel, 'quit', 'Stopped for now.', [{
    type: 'section',
    text: { type: 'mrkdwn', text: `No problem. Today's pick is still waiting whenever you want it.\n<${APP_URL}/daily|Take it in the app →>` },
  }]);
}

// Finish: hand the result to the shared rule engine and report what it awarded.
export async function finishSlackLesson({ email }) {
  const session = await readSession(email);
  if (!session?.plan) return;
  if (session.finishedAt) return; // already collected — ignore a second press

  const profile = await loadProfile(email);
  const correctness = correctnessOf(session);
  const award = await awardLessonComplete({
    email,
    learnerId: resolveLearnerId(profile),
    topic: session.topic,
    startedAt: session.startedAt,
    format: session.format || FORMAT,
    correctness,
    quizCorrect: quizCorrectOf(session),
    source: 'slack',
  });

  session.finishedAt = new Date().toISOString();
  session.awarded = award || null;
  await writeSession(email, session);

  const pct = Math.round(correctness * 100);
  const lines = [`*${session.topic}* — done. You scored *${pct}%*.`];

  if (award?.xpAwarded > 0) {
    lines.push(`*+${award.xpAwarded} XP* · Level ${award.level} (${getLevelTitle(award.level)}) · ${award.totalXp.toLocaleString()} XP total`);
    if (award.streak >= 2) lines.push(`🔥 ${award.streak}-day streak.`);
  } else if (award?.isRepeat) {
    lines.push("You'd already earned the XP for this one, so nothing new this time. Still counts for your streak.");
  } else if (award && !award.passed) {
    lines.push(`You need 70% to earn the XP on a lesson, so nothing this time. Retake it and a pass still pays the full amount.`);
  }
  if (award?.leveledUp) {
    lines.push(`⬆️ *You reached Level ${award.level}: ${getLevelTitle(award.level)}.*`);
  }
  for (const badgeId of award?.newBadges || []) {
    const meta = badgeMeta(badgeId);
    lines.push(`${meta.emoji} New badge: *${meta.name}*`);
  }

  await post(email, session.channel, 'complete', `Lesson complete: ${session.topic}`, [
    { type: 'header', text: { type: 'plain_text', text: '✅ Lesson complete' } },
    { type: 'section', text: { type: 'mrkdwn', text: clamp(lines.join('\n'), 2900) } },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'See the leaderboard' }, url: `${APP_URL}/leaderboard`, action_id: 'lesson_done_leaderboard' },
        { type: 'button', text: { type: 'plain_text', text: 'More in the app' }, url: `${APP_URL}/library`, action_id: 'lesson_done_library' },
      ],
    },
  ]);

  await logAuditEntry({
    type: 'lesson_complete',
    endpoint: '/api/slack',
    user: { email, name: profile.display_name || email },
    model: 'n/a',
    input: { topic: session.topic, format: session.format || FORMAT, correctness, source: 'slack' },
    output: {
      xpAwarded: award?.xpAwarded ?? 0,
      passed: award?.passed ?? false,
      level: award?.level ?? null,
      leveledUp: award?.leveledUp ?? false,
      newBadges: award?.newBadges || [],
    },
    durationMs: 0,
  }).catch(() => {});
  await logSlackMessage({
    email,
    direction: 'outbound',
    channel: session.channel,
    text: `Lesson complete: ${session.topic} (${pct}%, +${award?.xpAwarded ?? 0} XP)`,
    meta: { source: 'slack_lesson_complete', topic: session.topic, xpAwarded: award?.xpAwarded ?? 0 },
  }).catch(() => {});
}
