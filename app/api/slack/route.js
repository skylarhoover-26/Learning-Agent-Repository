import { after } from 'next/server';
import { MODELS } from '@/lib/models';
import { createHmac, timingSafeEqual } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { lookupSlackEmailByUserId } from '@/lib/slack-notify';
import { generateSlackReply } from '@/lib/slack-chat';
import {
  getLearnerSnapshot,
  buildLeaderboardBlocks,
  buildSkillsBlocks,
} from '@/lib/slack-personalize';
import {
  logSlackMessage,
  reserveSlackEvent,
  getConversationHistoryForEmail,
} from '@/lib/slack-conversation-store';

export const maxDuration = 60;

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learning-agent-pearl.vercel.app';

function verifySlackSignature(signature, timestamp, body) {
  if (!SIGNING_SECRET) return false;
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = createHmac('sha256', SIGNING_SECRET).update(sigBasestring).digest('hex');
  const computed = `v0=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

async function sendSlackMessage(channel, blocks, text) {
  if (!BOT_TOKEN) return;
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ channel, blocks, text }),
    });
  } catch (error) {
    console.error('Failed to send Slack message:', error);
  }
}

async function generateQuickTip(topic) {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODELS.sonnet,
      max_tokens: 300,
      system: 'You are an AI learning assistant at Housecall Pro. Give a concise, practical tip about the requested AI topic. Keep it to 2-3 short paragraphs. Focus on real-world application for non-technical employees. Use simple language.',
      messages: [{ role: 'user', content: `Give me a quick practical tip about: ${topic}` }],
    });

    const tipText = response.content[0]?.text || 'No tip generated.';
    return [
      { type: 'header', text: { type: 'plain_text', text: `💡 Quick Tip: ${topic}` } },
      { type: 'section', text: { type: 'mrkdwn', text: tipText } },
      { type: 'divider' },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Take a Full Lesson' },
          url: `${APP_URL}/lesson?topic=${encodeURIComponent(topic)}`,
          action_id: 'open_lesson',
        }],
      },
    ];
  } catch (error) {
    console.error('Claude API error:', error);
    return [
      { type: 'section', text: { type: 'mrkdwn', text: `I couldn't generate a tip right now. <${APP_URL}/lesson?topic=${encodeURIComponent(topic)}|Try a full lesson instead>.` } },
    ];
  }
}

function buildHelpBlocks() {
  return [
    { type: 'header', text: { type: 'plain_text', text: '🎓 AI Learning Coach — Slack' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          "*Just message me* with any question about AI — I'll answer right here and point you back to the app when there's something to try.",
          '',
          '*Quick commands:*',
          '`/learn [topic]` — a quick AI tip on any topic',
          '`/leaderboard` — where you stand this week',
          '`/heatmap` — your knowledge heatmap',
          '`/skills` — your skill breakdown',
        ].join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'Open the app' },
        url: APP_URL,
        action_id: 'open_platform',
      }],
    },
  ];
}

async function sendDelayedResponse(responseUrl, blocks, responseType) {
  try {
    const parsed = new URL(responseUrl);
    if (parsed.hostname !== 'hooks.slack.com') return;
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks,
        response_type: responseType,
        replace_original: false,
      }),
    });
  } catch (error) {
    console.error('Failed to send delayed response:', error);
  }
}

// Two-way DM chat. Runs in the background (after the 200 ack) so we never blow
// Slack's 3s deadline. Deduped on event_id so a retry can't double-reply.
async function handleDirectMessage(payload) {
  const event = payload.event || {};
  const eventId = payload.event_id;

  const proceed = await reserveSlackEvent(eventId);
  if (!proceed) return; // already handled (Slack retry)

  const slackUserId = event.user;
  const channel = event.channel;
  const text = (event.text || '').trim();
  if (!text || !channel) return;

  const { email } = await lookupSlackEmailByUserId(slackUserId);

  // Prior turns for multi-turn memory (fetched before we log the current one).
  const history = email ? await getConversationHistoryForEmail(email, 8) : [];

  await logSlackMessage({
    email,
    slackUserId,
    direction: 'inbound',
    channel,
    text,
    meta: { event_id: eventId, source: 'dm' },
  });

  const { blocks, text: replyText, meta } = await generateSlackReply({ text, email, history });
  await sendSlackMessage(channel, blocks, replyText);

  await logSlackMessage({
    email,
    slackUserId,
    direction: 'outbound',
    channel,
    text: replyText,
    meta,
  });
}

// Personalized slash commands (leaderboard / heatmap / skills) need an async
// email lookup, so they ack immediately then post the real data via response_url.
async function handleDataSlash(command, responseUrl, userId, userName) {
  const { email } = await lookupSlackEmailByUserId(userId);
  const snapshot = await getLearnerSnapshot(email);
  const isSkills = command === '/heatmap' || command === '/skills';
  const blocks = isSkills ? buildSkillsBlocks(snapshot) : buildLeaderboardBlocks(snapshot);
  await sendDelayedResponse(responseUrl, blocks, 'ephemeral');
  await logSlackMessage({
    email,
    slackUserId: userId,
    direction: 'inbound',
    channel: null,
    text: command,
    meta: { source: 'slash', command },
  });
  await logSlackMessage({
    email,
    slackUserId: userId,
    direction: 'outbound',
    channel: null,
    text: isSkills ? 'Sent knowledge heatmap summary.' : 'Sent leaderboard standing.',
    meta: { source: isSkills ? 'skills' : 'leaderboard', command },
  });
}

function handleSlashCommand(command, text, responseUrl, userId, userName) {
  switch (command) {
    case '/learn': {
      if (!text || text.trim() === '') {
        return { immediate: { blocks: buildHelpBlocks(), response_type: 'ephemeral' }, deferred: null };
      }
      const topic = text.trim();
      const deferred = async () => {
        const blocks = await generateQuickTip(topic);
        await sendDelayedResponse(responseUrl, blocks, 'in_channel');
      };
      return {
        immediate: { response_type: 'ephemeral', text: `Generating a tip on "${topic}"...` },
        deferred,
      };
    }
    case '/leaderboard':
    case '/streak':
    case '/heatmap':
    case '/skills': {
      const deferred = async () => {
        await handleDataSlash(command, responseUrl, userId, userName);
      };
      return {
        immediate: { response_type: 'ephemeral', text: 'One sec — pulling that up…' },
        deferred,
      };
    }
    default:
      return { immediate: { blocks: buildHelpBlocks(), response_type: 'ephemeral' }, deferred: null };
  }
}

export async function POST(request) {
  const contentType = request.headers.get('content-type') || '';
  const rawBody = await request.text();

  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');
  if (!signature || !timestamp || !verifySlackSignature(signature, timestamp, rawBody)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (contentType.includes('application/json')) {
    const payload = JSON.parse(rawBody);

    if (payload.type === 'url_verification') {
      return Response.json({ challenge: payload.challenge });
    }

    if (payload.type === 'event_callback') {
      const event = payload.event || {};
      // Only real, human, direct messages — ignore the bot's own posts, edits/
      // deletes (subtype), and non-DM channel types.
      const isHumanDM =
        event.type === 'message' &&
        !event.bot_id &&
        event.subtype === undefined &&
        event.channel_type === 'im';
      if (isHumanDM) {
        // Ack now; do the slow AI work after the response is flushed.
        after(() =>
          handleDirectMessage(payload).catch((err) =>
            console.error('DM handler error:', err)
          )
        );
      }
      return Response.json({ ok: true });
    }

    return Response.json({ ok: true });
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody);
    const command = params.get('command');
    const text = params.get('text') || '';
    const responseUrl = params.get('response_url') || '';
    const userId = params.get('user_id') || '';
    const userName = params.get('user_name') || '';

    const { immediate, deferred } = handleSlashCommand(command, text, responseUrl, userId, userName);

    if (deferred) {
      after(() => deferred().catch((err) => console.error('Deferred handler error:', err)));
    }

    return Response.json(immediate);
  }

  return Response.json({ error: 'Unsupported content type' }, { status: 400 });
}

export async function GET() {
  return Response.json({
    name: 'AI Learning Coach Slack Bot',
    status: 'active',
    commands: ['/learn', '/leaderboard', '/heatmap', '/skills'],
    configured: Boolean(SIGNING_SECRET && BOT_TOKEN),
  });
}
