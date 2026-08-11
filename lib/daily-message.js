// Copy for the weekday 9:30 AM Slack nudge.
//
// The old message was one hardcoded template, so the same eight lines arrived
// every single morning and started reading like furniture. It also never said
// what the day's topic actually WAS, even though sendDailyNotifications already
// resolves each learner's real pick (it only used the pick's href for the link).
//
// Variety here is a handwritten pool selected by a per-day, per-person seed, not
// generated copy: this message goes out unreviewed to everyone on the allowlist
// at a fixed time, so it should never depend on a model call inside the cron.
// Same person gets different copy tomorrow; two people get different copy today.
//
// House style, deliberately: no em dashes, short sentences, no hype. The topic
// name and the reason for it are the point, so they go near the top.

import { dailySeed } from './content-day';

// The greeting. Deliberately no time claims in here ("worth 5 minutes", "quick")
// because the CLOSERS pool makes the time promise — a message that opened with
// "worth 5 minutes" and closed with "even 3 minutes counts" contradicted itself.
// One claim, one place.
const OPENERS = [
  (name) => `Good morning, ${name}.`,
  (name) => `Morning, ${name}.`,
  (name) => `Hey ${name}, good morning.`,
  (name) => `${name}, your pick for today is ready.`,
  (name) => `Morning, ${name}. Something useful for you today.`,
  (name) => `Hi ${name}. Got something for you.`,
  (name) => `Good morning, ${name}. Ready when you are.`,
  (name) => `${name}, here is today's pick.`,
  (name) => `Morning, ${name}. Let's put one on the board.`,
  (name) => `Hey ${name}. Fresh pick, just for you.`,
  (name) => `Good morning, ${name}. Let's keep it moving.`,
  (name) => `${name}, today's lesson is queued up.`,
];

// How we frame the topic depends on WHY the algorithm chose it, so the message
// tells the truth about what this is: a refresher, a gap, or going deeper.
const TOPIC_FRAMES = {
  refresh: [
    (topic) => `Time for a refresher on *${topic}*.`,
    (topic) => `Let's sharpen *${topic}* again.`,
    (topic) => `*${topic}* is getting rusty. Quick tune-up today.`,
  ],
  new: [
    (topic) => `Today's topic: *${topic}*.`,
    (topic) => `Something new today: *${topic}*.`,
    (topic) => `Today we look at *${topic}*.`,
  ],
  deepen: [
    (topic) => `Going deeper on *${topic}* today.`,
    (topic) => `You started *${topic}*. Let's take it further.`,
    (topic) => `Next step on *${topic}*.`,
  ],
  start: [
    () => 'Your first lesson is ready whenever you are.',
    () => 'Today is a good day to start. Your first lesson is ready.',
    () => "Let's get your first one on the board.",
  ],
};

const CLOSERS = [
  'Even 3 minutes counts.',
  'Five minutes, and you are done.',
  'Short one today. Worth it.',
  'Quick enough to do before your next meeting.',
  'One lesson, and today is handled.',
  'Small habit, real payoff.',
  'Takes about as long as a coffee refill.',
  'No prep needed. Just open it.',
];

// Pick one entry from a pool, stable for the whole content-day and different per
// person. Salting by email is what stops the whole allowlist getting identical
// copy; salting by pool name stops the opener and closer moving in lockstep.
function choose(pool, email, poolName) {
  if (!pool?.length) return null;
  return pool[dailySeed(`${(email || '').toLowerCase()}|${poolName}`) % pool.length];
}

export function firstNameOf(profile, fallback = 'there') {
  return (
    profile?.first_name ||
    profile?.display_name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    fallback
  );
}

// "Day 6 streak. Level 7, 1,240 XP." Built from whatever is actually true, and
// omitted entirely for someone with nothing yet, since "Level 1, 0 XP" is a worse
// opening line than no line at all. A 1-day streak isn't a streak, so it's only
// mentioned from 2 up.
export function standingLine(standing) {
  if (!standing) return null;
  const parts = [];
  if (standing.streak >= 2) parts.push(`Day ${standing.streak} of your streak.`);
  if (standing.totalXp > 0) {
    parts.push(`Level ${standing.level}, ${standing.totalXp.toLocaleString()} XP.`);
  }
  return parts.length ? parts.join(' ') : null;
}

// The one-line reason this topic came up. The pick's own description is written
// for a card in the app ("It's been 41 days since you practiced this...") and
// reads fine here, so it's reused rather than reworded. Trimmed because Slack
// section text is capped at 3000 chars and long copy kills the message.
function reasonLine(pick) {
  const text = String(pick?.description || '').trim();
  if (!text) return null;
  return text.length > 300 ? `${text.slice(0, 299)}…` : text;
}

function topicLine(pick, email) {
  const type = TOPIC_FRAMES[pick?.type] ? pick.type : (pick?.topic ? 'new' : 'start');
  const frame = choose(TOPIC_FRAMES[type], email, `topic:${type}`);
  const topic = pick?.topic || pick?.title || '';
  return frame ? frame(topic) : `Today's topic: *${topic}*.`;
}

// Build the daily nudge.
//   profile        — the learner's stored profile (name)
//   pick           — resolved Today's Pick ({ type, topic, title, description, href, cta })
//   standing       — { streak, level, totalXp } from progression-server.readStanding
//   appUrl         — base URL for links
//   startPath      — resolved lesson path, or /daily as the fallback
//   slackLessonEnabled — whether to offer "Take it here in Slack" (Phase 4 flag).
//                        Off means the button is omitted rather than dead.
//
// Returns { blocks, text, topic }. `text` is the notification preview and the
// fallback wherever blocks can't render, so it carries the same information.
export function buildDailyMessage({
  profile,
  pick,
  standing = null,
  appUrl,
  startPath = '/daily',
  slackLessonEnabled = false,
}) {
  const name = firstNameOf(profile);
  const email = profile?.email;
  const opener = choose(OPENERS, email, 'opener')(name);
  const standing_ = standingLine(standing);
  const topic = topicLine(pick, email);
  const reason = reasonLine(pick);
  const closer = choose(CLOSERS, email, 'closer');

  // Standing gets its own line. Appended to the greeting it produced a long run-on
  // ("Morning, Skylar. Something useful for you today. Day 6 of your streak. Level
  // 7, 1,240 XP.") that buried the topic underneath it.
  const greeting = [opener, standing_].filter(Boolean).join('\n');
  const body = [topic, reason].filter(Boolean).join('\n');

  // One obvious primary action, with the alternative offered underneath as a plain
  // sentence rather than a competing button. Two side-by-side buttons made the
  // learner choose a SURFACE before they'd chosen to learn anything; this asks them
  // to begin, and mentions the app for whoever would rather be there.
  const appUrlFull = `${appUrl}${startPath}`;
  const canStartInSlack = slackLessonEnabled && Boolean(pick?.topic);

  const buttons = canStartInSlack
    ? [{
        type: 'button',
        text: { type: 'plain_text', text: 'Begin lesson' },
        // Carries the topic so the handler doesn't have to re-resolve the pick, and
        // can't drift from the topic this message actually advertised.
        action_id: 'daily_start_in_slack',
        value: JSON.stringify({ topic: pick.topic }).slice(0, 2000),
        style: 'primary',
      }]
    : [{
        type: 'button',
        text: { type: 'plain_text', text: 'Take it in the app' },
        url: appUrlFull,
        action_id: 'daily_open_app',
        style: 'primary',
      }];

  // Only shown when Begin lesson would keep them in Slack. With the flow disabled the
  // primary button already goes to the app, so repeating the link reads as a mistake.
  const appNote = canStartInSlack
    ? `Prefer to take this in the app? <${appUrlFull}|Open it there instead> and I'll drop you straight into today's pick.`
    : null;

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: greeting } },
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    { type: 'actions', elements: buttons },
    ...(appNote ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: appNote }] }] : []),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${closer} Reply here with any question and I can help.` }],
    },
  ];

  // Plain-text twin. Slack shows this in the notification and in clients that
  // can't render blocks, so it says the same things in the same order. Where blocks
  // give a Begin lesson button, the text can only offer the link.
  const text = [
    greeting,
    '',
    topic.replace(/\*/g, ''),
    reason || null,
    '',
    canStartInSlack
      ? `Tap Begin lesson to do it right here, or take it in the app: ${appUrlFull}`
      : `Take it in the app: ${appUrlFull}`,
    '',
    `${closer} Reply here with any question and I can help.`,
  ].filter((line) => line !== null).join('\n');

  return { blocks, text, topic: pick?.topic || null };
}
