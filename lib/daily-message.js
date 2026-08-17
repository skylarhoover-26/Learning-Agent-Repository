// Copy for the weekday 9:30 AM Slack nudge.
//
// The old message was one hardcoded template, so the same eight lines arrived
// every single morning and started reading like furniture. It also never said
// what the day's topic actually WAS, even though sendDailyNotifications already
// resolves each learner's real pick (it only used the pick's href for the link).
//
// The greeting and the reason are written per send by lib/daily-message-ai.js, so the
// copy is fresh every time and the reason can say something true about the actual
// topic. This module keeps the handwritten pool below as the FALLBACK for when that
// model call fails: a hiccup at 9:30 AM should cost variety, never the nudge.
//
// The pool is seeded by content-day + email, which is why a real learner's fallback
// copy is stable for the day but differs from a colleague's.
//
// Facts stay in code, never in the model's output: the topic name, streak, level, XP
// and buttons are all assembled here. A model that phrases the standing line is a
// model that can get someone's XP wrong.
//
// House style, deliberately: no em dashes, short sentences, no hype. The topic
// name and the reason for it are the point, so they go near the top.

import { contentDayWeekday, contentDayIndex, dailySeed } from './content-day';
import { XP_AMOUNTS } from './progression-core';
import { capSentences } from './text-trim';

// The greeting, and the only line that varies per person per day.
//
// Ten of them, each naming the day of the week (feedback #194). The greeting used
// to be written by the model, which produced lines like "quick thing this morning"
// that read as throwaway and made a time claim nothing else in the message backed
// up. Naming the day is a small thing that makes the nudge feel addressed to today
// rather than generated, and keeping it in code means it can't drift.
//
// Deliberately no time claims in here ("worth 5 minutes", "quick"): the message used
// to end on a rotating time promise too, and the two could contradict each other
// ("worth 5 minutes" against "even 3 minutes counts"). That closing pool is gone now,
// and these stay claim-free so nothing here has to be kept in step with it.
const OPENERS = [
  (name, day) => `Happy ${day}, ${name}.`,
  (name, day) => `Morning, ${name}. Here is your ${day} pick.`,
  // Feedback #212: this one line was flat next to the others. It's an announcement,
  // so it gets the exclamation mark.
  (name, day) => `Good morning, ${name}. ${day}'s lesson is ready!`,
  (name, day) => `Hey ${name}, happy ${day}.`,
  (name, day) => `${name}, here is what ${day} has for you.`,
  (name, day) => `Morning, ${name}. Something useful for your ${day}.`,
  (name, day) => `Good morning, ${name}. Let's start ${day} with something good.`,
  (name, day) => `Hey ${name}. Your ${day} pick is queued up.`,
  (name, day) => `${name}, ${day} is a good day to learn something.`,
  (name, day) => `Good morning, ${name}. One thing for ${day}.`,
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

// The message used to end on a rotating nudge ("Even 3 minutes counts", "No prep
// needed. Just open it."). Cut on Skylar's call, 2026-08-11: the button already says
// what to do, so the extra encouragement was padding, and some variants read as
// nagging. The closing line is now just the offer of help.
const SIGN_OFF = 'Reply here with any question and I can help.';

// Pick one entry from a pool, stable for the whole content-day and different per
// person. Salting by email is what stops the whole allowlist getting identical copy;
// salting by pool name keeps the greeting and the topic framing from moving in
// lockstep, so they don't always pair up the same way.
function choose(pool, email, poolName) {
  if (!pool?.length) return null;
  // Rotation, not a hash pick. `dailySeed(...) % pool.length` chose independently
  // each day, so with ten openers about one morning in ten repeated yesterday's
  // greeting outright, and a given line could come back twice in a week while
  // others went unused for a month — which is what "make the messages more unique
  // each day" was about (feedback #190). Adding the day index walks the pool one
  // step per day, so consecutive days can never collide and every entry is used
  // once before any repeats. The per-person salt is the starting offset, so two
  // colleagues still open different lines on the same morning.
  //
  // The offset must NOT come from dailySeed: that folds the date into its hash, so
  // it would change every morning and turn the rotation back into a random pick.
  const offset = stableHash(`${(email || '').toLowerCase()}|${poolName}`);
  return pool[(contentDayIndex() + offset) % pool.length];
}

// A per-person, date-independent number. Only ever used modulo a pool length, so
// it just needs to be stable and well spread, not cryptographic.
function stableHash(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

export function firstNameOf(profile, fallback = 'there') {
  return (
    profile?.first_name ||
    profile?.display_name?.split(' ')[0] ||
    profile?.name?.split(' ')[0] ||
    fallback
  );
}

// Feedback #213: the standing line was a bare readout — "Day 6 of your streak.
// Level 7, 1,240 XP." — which assumes the reader already knows what an XP is, what
// a level is worth, and what happens if they skip today. None of that is obvious to
// someone three days into using this. So each part now says what it MEANS: where
// they stand, what today is worth, and what the streak costs to drop.
//
// Randomized per person per day the same way the openers are, so a daily message
// doesn't read as the same template with the numbers swapped.
const XP_FRAMES = [
  (xp, lvl) => `You're at ${xp} XP, which puts you at level ${lvl}.`,
  (xp, lvl) => `You've earned ${xp} XP so far. That's level ${lvl}.`,
  (xp, lvl) => `${xp} XP banked, level ${lvl}.`,
];

// What today's lesson pays. Today's Pick opens as a Quick Lesson, so this is
// XP_AMOUNTS.quick_lesson — imported rather than typed, because a message that
// promises the wrong number is worse than one that promises nothing. "Up to",
// because the award scales with how well they do and a fail pays nothing.
const WORTH_FRAMES = [
  (xp) => `Today's lesson is worth up to ${xp} XP.`,
  (xp) => `There's up to ${xp} XP in today's lesson.`,
  (xp) => `Finish today's and that's up to ${xp} XP.`,
];

const STREAK_FRAMES = [
  (n) => `You're on a ${n} day streak. Today keeps it alive.`,
  (n) => `${n} days in a row so far. Don't break it today.`,
  (n) => `Day ${n} of your streak, and it only holds if you show up today.`,
];

// "You're #8 of 199 on the leaderboard. Matt Evans is 48 XP ahead of you."
//
// Feedback #214 asked for competitive framing like Road Warrior's. Two deliberate
// departures from that example: it says XP and "on the leaderboard" rather than
// "points this week" and "submissions", because our board is all-time XP and
// inventing a weekly frame would be a lie; and it runs on MONDAYS ONLY (Skylar's
// call) — a daily ranking nag is a different product from a weekly one.
const RANK_FRAMES = [
  (rank, total) => `You're #${rank} of ${total} on the leaderboard.`,
  (rank, total) => `Right now you sit at #${rank} out of ${total}.`,
  (rank, total) => `#${rank} of ${total} across the company.`,
];

const CHASE_FRAMES = [
  (name, gap) => `${name} is ${gap} XP ahead of you.`,
  (name, gap) => `${gap} XP is all that separates you from ${name}.`,
  (name, gap) => `Catch ${name} and you take their spot. The gap is ${gap} XP.`,
];

export function standingLine(standing, email = null) {
  if (!standing) return null;
  const parts = [];
  if (standing.streak >= 2) {
    parts.push(choose(STREAK_FRAMES, email, 'streak')(standing.streak));
  }
  if (standing.totalXp > 0) {
    parts.push(choose(XP_FRAMES, email, 'xp')(standing.totalXp.toLocaleString(), standing.level));
  }
  // Only offered alongside a real standing: "today is worth 40 XP" as the very first
  // thing someone ever reads from us has nothing to anchor against.
  if (parts.length) {
    parts.push(choose(WORTH_FRAMES, email, 'worth')(XP_AMOUNTS.quick_lesson));
  }
  return parts.length ? parts.join(' ') : null;
}

// Monday's extra line. `rank` is { rank, total, aheadName, aheadGap } or null —
// resolved by the caller, which is the only place that can read the leaderboard.
export function competitiveLine(rank, email = null) {
  if (!rank?.rank || !rank?.total) return null;
  const parts = [choose(RANK_FRAMES, email, 'rank')(rank.rank, rank.total)];
  if (rank.aheadName && rank.aheadGap > 0) {
    parts.push(choose(CHASE_FRAMES, email, 'chase')(rank.aheadName, rank.aheadGap.toLocaleString()));
  }
  return parts.join(' ');
}

// The one-line reason this topic came up. The pick's own description is written
// for a card in the app ("It's been 41 days since you practiced this...") and
// reads fine here, so it's reused rather than reworded. Trimmed because Slack
// section text is capped at 3000 chars and long copy kills the message.
function reasonLine(pick) {
  const text = String(pick?.description || '').trim();
  if (!text) return null;
  // Same 260 cap the model's version gets, so the fallback can't be the long one —
  // and the same sentence-aware trim, so neither path can arrive mid-word (#213).
  return capSentences(text, 260);
}

function topicLine(pick, email) {
  const type = TOPIC_FRAMES[pick?.type] ? pick.type : (pick?.topic ? 'new' : 'start');
  const frame = choose(TOPIC_FRAMES[type], email, `topic:${type}`);
  const topic = pick?.topic || pick?.title || '';
  return frame ? frame(topic) : `Today's topic: *${topic}*.`;
}

// The exact training being offered, named the same way the app names it, so the
// DM and the lesson header agree (feedback #190: "mention the exact training they
// are taking"). Today's Pick always opens as a Quick Lesson, but the label is
// derived rather than hardcoded so it stays right if that ever changes.
//
// No duration here on purpose — see the note on OPENERS about time claims.
const FORMAT_LABEL = {
  quick_tip: 'Quick Tip', standard: 'Quick Lesson',
  deep_dive: 'Deep Dive', project_quest: 'Project Quest',
};

function formatLabel(pick) {
  return FORMAT_LABEL[pick?.format || 'standard'] || null;
}

// Build the daily nudge.
//   profile        — the learner's stored profile (name)
//   pick           — resolved Today's Pick ({ type, topic, title, description, href, cta })
//   standing       — { streak, level, totalXp } from progression-server.readStanding
//   appUrl         — base URL for links
//   startPath      — resolved lesson path, or /daily as the fallback
//   slackLessonEnabled — whether to offer "Take it here in Slack" (Phase 4 flag).
//                        Off means the button is omitted rather than dead.
//   aiCopy         — optional { greeting, why } from lib/daily-message-ai.js. When
//                    present it replaces the pooled greeting and the pick's generic
//                    description; when absent (model failure) the pool still works,
//                    which is why the pool stays.
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
  aiCopy = null,
  rank = null,
}) {
  const name = firstNameOf(profile);
  const email = profile?.email;
  // The greeting is always ours now — the model only writes the reason. See the
  // OPENERS note above.
  const opener = choose(OPENERS, email, 'opener')(name, contentDayWeekday());
  const standing_ = standingLine(standing, email);
  // Monday only, by design (#214). The caller decides whether to resolve a rank at
  // all; this guard means a rank passed on a Tuesday still doesn't print, so the
  // "weekly, not daily" rule lives in one place rather than two.
  const competitive = contentDayWeekday() === 'Monday' ? competitiveLine(rank, email) : null;
  const topic = topicLine(pick, email);
  const reason = aiCopy?.why || reasonLine(pick);

  // Standing gets its own line. Appended to the greeting it produced a long run-on
  // ("Morning, Skylar. Something useful for you today. Day 6 of your streak. Level
  // 7, 1,240 XP.") that buried the topic underneath it.
  const greeting = [opener, standing_, competitive].filter(Boolean).join('\n');
  const body = [topic, reason].filter(Boolean).join('\n');

  // Both surfaces are offered as buttons, with the app as the primary one.
  //
  // This used to be a single "Begin lesson" button that ran the lesson inside Slack,
  // with the app mentioned underneath in a sentence. Nobody read the sentence: the
  // button did the whole lesson in the DM and it was not obvious the app was even an
  // option (feedback #194). So the app is now the styled primary, and staying in
  // Slack is a plain secondary button sitting next to it — present and clickable,
  // visibly the lighter-weight choice.
  const appUrlFull = `${appUrl}${startPath}`;
  const canStartInSlack = slackLessonEnabled && Boolean(pick?.topic);

  const buttons = [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'Open the app' },
      url: appUrlFull,
      action_id: 'daily_open_app',
      style: 'primary',
    },
    ...(canStartInSlack
      ? [{
          type: 'button',
          text: { type: 'plain_text', text: 'Or take it here in Slack' },
          // Carries the topic so the handler doesn't have to re-resolve the pick, and
          // can't drift from the topic this message actually advertised.
          action_id: 'daily_start_in_slack',
          value: JSON.stringify({ topic: pick.topic }).slice(0, 2000),
        }]
      : []),
  ];

  // Names the exact training on its own line, right above the buttons, so the
  // learner knows what they are committing to before they press one.
  const trainingLabel = formatLabel(pick);
  const trainingLine = trainingLabel && pick?.topic
    ? `*${trainingLabel}:* ${pick.topic}`
    : null;

  // Easter egg: about one weekday in five, the coaching capybara rides along as
  // the greeting's thumbnail. See lib/easter-eggs.js: slack-coach.
  //
  // Served from /brand/, not blob storage: that path is already in the middleware
  // exclusion list, so Slack's image fetcher can reach it without a session. A
  // blob upload would have needed a token and a second place to keep the asset.
  //
  // It is DECORATIVE only and does not count toward the collection — collecting
  // requires a click in the app, and nothing clicked in Slack can pay XP into the
  // ledger. Deliberately not every day: a mascot on every message is branding,
  // not an easter egg.
  const capyDay = dailySeed(`capy-slack|${email || ''}`) % 5 === 0;
  const greetingBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: greeting },
    ...(capyDay && appUrl
      ? {
          accessory: {
            type: 'image',
            image_url: `${appUrl}/brand/capybara-headset.png`,
            alt_text: 'A capybara wearing a headset',
          },
        }
      : {}),
  };

  const blocks = [
    greetingBlock,
    { type: 'section', text: { type: 'mrkdwn', text: body } },
    ...(trainingLine ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: trainingLine }] }] : []),
    { type: 'actions', elements: buttons },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: SIGN_OFF }],
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
    trainingLine ? trainingLine.replace(/\*/g, '') : null,
    '',
    canStartInSlack
      ? `Open the app to take it there: ${appUrlFull}. Or tap "Or take it here in Slack" to do it in this DM.`
      : `Open the app to take it: ${appUrlFull}`,
    '',
    SIGN_OFF,
  ].filter((line) => line !== null).join('\n');

  return { blocks, text, topic: pick?.topic || null };
}
