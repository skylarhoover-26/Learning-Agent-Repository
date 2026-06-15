import { createHmac, timingSafeEqual } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { SKILLS } from '@/lib/heatmap-data';

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://ai-learning-platform.vercel.app';

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
        'Authorization': `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify({ channel, blocks, text }),
    });
  } catch (error) {
    console.error('Failed to send Slack message:', error);
  }
}

function buildHeatmapBlocks() {
  const categories = ['Foundations', 'Application', 'Safety', 'Frontier'];
  const sections = categories.map(cat => {
    const catSkills = SKILLS.filter(s => s.category === cat);
    const lines = catSkills.map(s => {
      const bar = '█'.repeat(Math.round(s.mastery / 10)) + '░'.repeat(10 - Math.round(s.mastery / 10));
      const stale = s.freshness > 60 ? ' ⚠️' : '';
      return `${bar} ${s.mastery}% ${s.name}${stale}`;
    }).join('\n');
    return {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${cat}*\n\`\`\`${lines}\`\`\`` },
    };
  });

  return [
    { type: 'header', text: { type: 'plain_text', text: '🧠 Knowledge Heatmap' } },
    ...sections,
    { type: 'divider' },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View Full Heatmap' },
        url: `${APP_URL}/heatmap`,
        action_id: 'open_heatmap',
      }],
    },
  ];
}

function buildStreakBlocks() {
  return [
    { type: 'header', text: { type: 'plain_text', text: '🔥 Your Learning Streak' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Current streak:* 3 days\n*Total lessons:* 4 completed\n*Level:* 3 (250 XP)',
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'Open Dashboard' },
        url: APP_URL,
        action_id: 'open_dashboard',
      }],
    },
  ];
}

async function generateQuickTip(topic) {
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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
    { type: 'header', text: { type: 'plain_text', text: '🎓 AI Learning Platform — Slack Bot' } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          '*Available commands:*',
          '`/learn [topic]` — Get a quick AI tip on any topic',
          '`/streak` — Check your learning streak & progress',
          '`/heatmap` — See your knowledge heatmap summary',
          '`/skills` — View your skill breakdown',
          '',
          'Or just message me with a question about AI!',
        ].join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'Open Learning Platform' },
        url: APP_URL,
        action_id: 'open_platform',
      }],
    },
  ];
}

function buildSkillsBlocks() {
  const strong = SKILLS.filter(s => s.mastery >= 70);
  const growing = SKILLS.filter(s => s.mastery >= 30 && s.mastery < 70);
  const gaps = SKILLS.filter(s => s.mastery < 30);

  const fmt = (list) => list.length === 0
    ? '_None yet_'
    : list.map(s => `• ${s.name} (${s.mastery}%)`).join('\n');

  return [
    { type: 'header', text: { type: 'plain_text', text: '📊 Your Skills' } },
    { type: 'section', text: { type: 'mrkdwn', text: `*✅ Strong (${strong.length})*\n${fmt(strong)}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*📈 Growing (${growing.length})*\n${fmt(growing)}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*🔲 Gaps (${gaps.length})*\n${fmt(gaps)}` } },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Heatmap' },
          url: `${APP_URL}/heatmap`,
          action_id: 'open_heatmap',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Skill Graph' },
          url: `${APP_URL}/skill-graph`,
          action_id: 'open_skill_graph',
        },
      ],
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

function handleSlashCommand(command, text, responseUrl) {
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
    case '/streak':
      return { immediate: { response_type: 'ephemeral', text: '🔥 *Your Learning Streak*\n\n*Current streak:* 3 days\n*Total lessons:* 4 completed\n*Level:* 3 (250 XP)\n\n<' + APP_URL + '|Open Dashboard>' }, deferred: null };
    case '/heatmap':
      return { immediate: { blocks: buildHeatmapBlocks(), response_type: 'ephemeral' }, deferred: null };
    case '/skills':
      return { immediate: { blocks: buildSkillsBlocks(), response_type: 'ephemeral' }, deferred: null };
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
      const event = payload.event;
      if (event.type === 'message' && !event.bot_id && event.channel_type === 'im') {
        const blocks = buildHelpBlocks();
        await sendSlackMessage(event.channel, blocks, 'Here are the available commands:');
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

    const { immediate, deferred } = handleSlashCommand(command, text, responseUrl);

    if (deferred) {
      deferred().catch(err => console.error('Deferred handler error:', err));
    }

    return Response.json(immediate);
  }

  return Response.json({ error: 'Unsupported content type' }, { status: 400 });
}

export async function GET() {
  return Response.json({
    name: 'AI Learning Platform Slack Bot',
    status: 'active',
    commands: ['/learn', '/streak', '/heatmap', '/skills'],
    configured: Boolean(SIGNING_SECRET && BOT_TOKEN),
  });
}
