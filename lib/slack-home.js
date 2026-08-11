// The Slack App Home tab for the AI Learning Coach.
//
// Slack shows its own "This is still a work in progress" placeholder whenever an
// app has the Home tab enabled but has never published a view — which is exactly
// what learners were hitting. This module builds a real view and pushes it with
// views.publish every time the tab is opened, so it always reflects current XP,
// rank and Today's Pick rather than a snapshot from whenever it was last written.
//
// Server-only. Never throws: any data hiccup degrades to the static welcome view
// instead of leaving Slack's placeholder on screen.

import { getLearnerSnapshot, firstNameFromProfile } from '@/lib/slack-personalize';
import { resolveDailyPick } from '@/lib/daily-pick-server';
import { lookupSlackEmailByUserId } from '@/lib/slack-notify';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Slack caps plain_text header blocks at 150 characters and rejects the whole
// view if any block overflows, so every interpolated string gets clamped.
const HEADER_MAX = 150;

function clamp(text, max = HEADER_MAX) {
  const str = String(text || '');
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function button(text, url, actionId, style) {
  const element = {
    type: 'button',
    text: { type: 'plain_text', text },
    url,
    action_id: actionId,
  };
  return style ? { ...element, style } : element;
}

// The standing line. Streak is included now that progression-server can read the
// ledgers it's derived from (it was browser-only, which is why this used to show
// level/XP/rank and stop there).
function standingSection(snapshot) {
  const streak = snapshot.streak >= 2 ? `  ·  🔥 *${snapshot.streak}-day streak*` : '';
  const text = snapshot.onBoard
    ? `*Level ${snapshot.level}*  ·  *${snapshot.totalXp.toLocaleString()} XP*  ·  *#${snapshot.rank}* of ${snapshot.totalPeople} on the leaderboard${streak}`
    : "You haven't earned XP yet. Finish one lesson or game and you'll claim a spot on the leaderboard.";
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

// Today's Pick, if one resolved. Deep-links to the pre-generated lesson so the
// tab hands off to the same pick the web app and the daily DM are showing.
function pickBlocks(pick) {
  if (!pick?.title) return [];
  return [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 Today's Pick*\n*${clamp(pick.title, 200)}*\n${clamp(pick.description || '', 400)}`,
      },
    },
    {
      type: 'actions',
      elements: [
        button(clamp(pick.cta || 'Start lesson', 75), `${APP_URL}${pick.href || '/daily'}`, 'home_daily_pick', 'primary'),
      ],
    },
  ];
}

function whatICanDoBlocks() {
  return [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          '*What I can do here*',
          '',
          '• *Just message me* with any AI question — I answer right in this DM.',
          "• Ask me about today's pick and I can help you through it.",
          "• `/pick` — today's lesson, and why you got it.",
          '• `/learn [topic]` — a quick, practical AI tip on anything.',
          '• `/leaderboard` — where you stand this week.',
          '• `/heatmap` or `/skills` — your strengths and gaps.',
        ].join('\n'),
      },
    },
    {
      type: 'actions',
      elements: [
        button('Open the app', APP_URL, 'home_open_app'),
        button('Browse lessons', `${APP_URL}/library`, 'home_open_library'),
        button('Play a game', `${APP_URL}/games`, 'home_open_games'),
        button('Leaderboard', `${APP_URL}/leaderboard`, 'home_open_leaderboard'),
      ],
    },
  ];
}

// The view a learner we can't match to an app account sees — most often someone
// who hasn't signed into the app yet, so the whole job is to get them there.
export function buildUnlinkedHomeBlocks() {
  return [
    { type: 'header', text: { type: 'plain_text', text: '🎓 AI Learning Coach' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "Your personal AI coach at Housecall Pro. Short lessons and games built around the work you actually do.\n\nSign in to the app once and this tab will show your level, XP and today's pick.",
      },
    },
    { type: 'actions', elements: [button('Sign in to get started', APP_URL, 'home_sign_in', 'primary')] },
    ...whatICanDoBlocks(),
  ];
}

// The full personalized view.
export function buildHomeBlocks(snapshot, pick) {
  const name = firstNameFromProfile(snapshot?.profile);
  return [
    { type: 'header', text: { type: 'plain_text', text: clamp(`🎓 Welcome back, ${name}`) } },
    standingSection(snapshot),
    ...pickBlocks(pick),
    ...whatICanDoBlocks(),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Updates every time you open this tab.' }],
    },
  ];
}

// Resolve everything the view needs for one learner. Each source is independently
// guarded so a slow leaderboard or a missing pick still renders a useful tab.
async function loadHomeBlocks(slackUserId) {
  let email = null;
  try {
    ({ email } = await lookupSlackEmailByUserId(slackUserId));
  } catch (error) {
    console.error('Slack home: email lookup failed:', error);
  }
  if (!email) return buildUnlinkedHomeBlocks();

  let snapshot = null;
  try {
    snapshot = await getLearnerSnapshot(email);
  } catch (error) {
    console.error('Slack home: snapshot failed:', error);
  }
  if (!snapshot) return buildUnlinkedHomeBlocks();

  let pick = null;
  try {
    // resolveDailyPick keys off profile.email; a profile loaded from blob has it,
    // but pass it explicitly so a partial profile still resolves a pick.
    const profile = { ...(snapshot.profile || {}), email };
    ({ pick } = await resolveDailyPick(profile));
  } catch (error) {
    console.error('Slack home: daily pick failed:', error);
  }

  return buildHomeBlocks(snapshot, pick);
}

// Publish the Home tab for one Slack user. Called on every app_home_opened, so
// the tab is always current; returns true only when Slack accepted the view.
export async function publishHomeView(slackUserId) {
  if (!BOT_TOKEN || !slackUserId) return false;
  try {
    const blocks = await loadHomeBlocks(slackUserId);
    const res = await fetch('https://slack.com/api/views.publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify({
        user_id: slackUserId,
        view: { type: 'home', blocks },
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      // Slack returns the offending block path in `response_metadata` — log it,
      // because a rejected view leaves the placeholder on screen.
      console.error('Slack views.publish rejected:', data.error, JSON.stringify(data.response_metadata || {}));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Slack views.publish failed:', error);
    return false;
  }
}
