import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { getUserData, saveUserData } from '@/lib/blob-store';
import { contentDayKey } from '@/lib/content-day';
import { logAuditEntry } from '@/lib/audit-log';

// "Why this matters to YOU" for each AI-news item.
//
// The news list shows the publisher's own blurb, which summarises the ARTICLE.
// Testers asked for the opposite: not what the article says, but what changed and
// why it lands on their desk — a new model that changes how they should prompt is
// only interesting if you're told what to do differently (feedback #145).
//
// Cost is the reason this is shaped the way it is. A line per item per learner is
// a lot of generation if done naively, so:
//   - ONE call covers every item on the page, not one call per item.
//   - The result is cached per learner per content-day, so a second visit, a
//     refresh, or another device costs nothing.
//   - Haiku, because these are one-sentence outputs.
// That works out to a single small call per learner per day.
export const maxDuration = 60;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const CACHE_TYPE = 'ai_news_why';
const MAX_ITEMS = 12;

function learnerContext(profile) {
  const bits = [];
  if (profile?.department) bits.push(`They work in ${profile.department}${profile.sub_team ? ` (${profile.sub_team})` : ''}.`);
  const tasks = Array.isArray(profile?.top_tasks) ? profile.top_tasks.filter(Boolean).slice(0, 5) : [];
  if (tasks.length) bits.push(`Day to day they: ${tasks.join(', ')}.`);
  if (profile?.goal) bits.push(`Their learning goal: ${profile.goal}.`);
  if (profile?.tier) bits.push(`Their AI comfort level: ${profile.tier}.`);
  return bits.join(' ');
}

const SYSTEM = [
  'You explain AI news to one specific person at Housecall Pro, in one sentence per item.',
  '',
  'For each item you are given an id, a headline and the publisher blurb. Return ONE sentence per id',
  'answering: what changed, and what it means for THIS person\'s work.',
  '',
  'RULES:',
  '- Lead with the consequence for them, not with a restatement of the headline. They can already read the headline.',
  '- Be concrete. "You can now paste a whole spreadsheet into one prompt instead of splitting it" beats "this improves capability".',
  '- If it changes how they should PROMPT or which tool they should reach for, say that plainly. That is the most useful thing you can tell them.',
  '- If an item genuinely does not affect their work, say so in a short honest sentence. Do not invent relevance.',
  '- Never promise a feature the blurb does not state. You have only the headline and blurb.',
  '- One sentence. Maximum 30 words. No preamble, no "this article".',
  '',
  'STYLE: plain and warm. No em dashes or en dashes. No hype. Write "Housecall Pro" in full, never HCP.',
  '',
  'Return ONLY valid JSON (no markdown fences): {"<id>": "<one sentence>", ...}',
].join('\n');

export async function POST(request) {
  try {
    const profile = await getAuthenticatedProfile();
    const email = profile?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const items = (Array.isArray(body.items) ? body.items : [])
      .filter((i) => i?.id && i?.title)
      .slice(0, MAX_ITEMS);
    if (!items.length) return NextResponse.json({ why: {} });

    const dayKey = contentDayKey();
    const cached = await getUserData(email, CACHE_TYPE).catch(() => null);

    // Reuse whatever the cache already has for today and only generate the rest.
    // The news list changes during the day as the scan adds items, so a strict
    // "same day, same answer" cache would leave new arrivals permanently blank.
    const known = cached?.day === dayKey && cached?.why ? cached.why : {};
    const missing = items.filter((i) => !known[i.id]);
    if (!missing.length) {
      return NextResponse.json({ why: pickFor(known, items), cached: true });
    }

    const list = missing
      .map((i) => `id: ${i.id}\nheadline: ${i.title}\nblurb: ${String(i.summary || '').slice(0, 400)}`)
      .join('\n\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          learnerContext(profile) || 'No role details on file, so keep it general but still concrete.',
          '',
          'Items:',
          list,
        ].join('\n'),
      }],
    });

    const text = response.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? safeParse(match[0]) : null;
    // A model hiccup must never blank the page: fall through to whatever the cache
    // already had, and the UI simply shows no extra line for the new items.
    if (!parsed) return NextResponse.json({ why: pickFor(known, items) });

    const merged = { ...known };
    for (const item of missing) {
      const line = clean(parsed[item.id]);
      if (line) merged[item.id] = line;
    }

    await saveUserData(email, CACHE_TYPE, { day: dayKey, why: merged }).catch(() => {});

    logAuditEntry({
      type: 'ai_news_why',
      endpoint: '/api/ai-news/why',
      user: { email, name: profile?.display_name || 'Unknown' },
      model: MODELS.haiku,
      input: { items: missing.length },
      output: { generated: Object.keys(merged).length - Object.keys(known).length },
    }).catch(() => {});

    return NextResponse.json({ why: pickFor(merged, items) });
  } catch (error) {
    console.error('POST /api/ai-news/why error:', error);
    // Soft-fail: the news list is still perfectly usable without these lines.
    return NextResponse.json({ why: {} });
  }
}

function pickFor(map, items) {
  const out = {};
  for (const i of items) if (map[i.id]) out[i.id] = map[i.id];
  return out;
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

// House style enforced in code, not merely requested in the prompt.
function clean(value) {
  if (typeof value !== 'string') return null;
  const out = value
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\bHCP\b/g, 'Housecall Pro')
    .replace(/\s+/g, ' ')
    .trim();
  return out ? out.slice(0, 240) : null;
}
