import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { AI_TOOLS } from '@/lib/ai-tools';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdmin } from '@/lib/admin';
import { saveModelLineup, getModelLineup, GENERAL_GUIDANCE } from '@/lib/model-lineup';

// LLM + web search can run well past the default function budget; without this
// the route times out before it can persist, and the refresh silently no-ops.
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Anthropic server-side web search — same spec the lesson planner uses to ground
// niche topics. This is what makes the refresh return *current* model facts.
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

function client() {
  return new Anthropic();
}

function responseText(response) {
  return (response.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// Cron (Bearer CRON_SECRET) OR a signed-in admin may trigger a refresh.
async function isAuthorized(req) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  try {
    const user = await getAuthenticatedUser();
    return !!(user?.email && (await isAdmin(user.email)));
  } catch {
    return false;
  }
}

function buildPrompt(nowIso) {
  const toolList = AI_TOOLS.map((t) => `${t.label} (id: ${t.id})`).join(', ');
  return [
    'You maintain a "current AI model lineup" reference for an internal AI-learning platform.',
    'Use web search to find, as of TODAY, which specific models are the current fast/default vs. deep-reasoning ("thinking") tiers inside each of these consumer AI tools:',
    `  ${toolList}`,
    '',
    `Today is ${nowIso}. Prefer official sources (the vendor\'s own model/pricing pages). If a tool exposes only one model to end users, leave the tiers you can\'t confirm as null rather than guessing.`,
    '',
    'Return ONLY a JSON object, no markdown fences, with this exact shape:',
    '{',
    '  "general_guidance": string,   // one short paragraph on matching model tier to task; keep it tool-agnostic',
    '  "tools": [',
    '    {',
    '      "id": string,             // one of the ids above',
    '      "label": string,          // the tool\'s display name',
    '      "fast": string|null,      // the fast/default everyday model name, or null if unknown',
    '      "balanced": string|null,  // a mid tier if the tool has one, else null',
    '      "reasoning": string|null, // the deep-reasoning/thinking model name, or null if unknown',
    '      "note": string|null       // one plain-language sentence: when to reach for which tier in THIS tool',
    '    }',
    '  ]',
    '}',
    '',
    'Rules: keep model names short (no version dates unless that IS the public name). Do not invent tiers a tool does not offer. Keep every "note" to one sentence, jargon-free.',
  ].join('\n');
}

async function runRefresh() {
  const nowIso = new Date().toISOString();
  const response = await client().messages.create({
    model: MODELS.sonnet,
    max_tokens: 2000,
    system: buildPrompt(nowIso),
    messages: [{ role: 'user', content: 'Produce the current model lineup JSON.' }],
    tools: [WEB_SEARCH_TOOL],
  });

  let text = responseText(response).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No JSON object in refresh response');
    parsed = JSON.parse(m[0]);
  }

  const saved = await saveModelLineup({
    ...parsed,
    general_guidance: parsed.general_guidance || GENERAL_GUIDANCE,
    updated_at: nowIso,
    source: 'ai',
  });
  return saved;
}

export async function POST(req) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const lineup = await runRefresh();
    return NextResponse.json({ status: 'ok', lineup });
  } catch (error) {
    console.error('Model lineup refresh failed:', error);
    // Never break the app on a bad refresh — the last good (or seed) lineup stays live.
    const current = await getModelLineup();
    return NextResponse.json(
      { status: 'error', error: error.message, lineup: current },
      { status: 502 },
    );
  }
}

// Vercel cron issues GET; delegate to the same handler so the schedule works.
export async function GET(req) {
  return POST(req);
}
