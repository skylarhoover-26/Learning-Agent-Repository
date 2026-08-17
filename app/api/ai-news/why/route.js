import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { getAuthenticatedProfile } from '@/lib/auth-helpers';
import { getUserData, saveUserData } from '@/lib/blob-store';
import { withProjects } from '@/lib/work-projects';
import { buildSignalBlock, signalSignature } from '@/lib/learner-signals';
import { chosenTools } from '@/lib/ai-tools';
import { untrusted, QUARANTINE_NOTE } from '@/lib/untrusted';
import { contentDayKey } from '@/lib/content-day';
import { logAuditEntry } from '@/lib/audit-log';
import { enforceRateLimit } from '@/lib/rate-limit';

// Ranks the AI-news feed against ONE learner, and explains the top of it.
//
// The news list shows the publisher's own blurb, which summarises the ARTICLE.
// Testers asked for the opposite: not what the article says, but what changed and
// why it lands on their desk, and for the feed to LEAD with the items that do
// (feedback #145). So this returns three things per item:
//
//   score — 0-100, how much this changes THIS person's work. Drives the lanes.
//   match — the short reason, for the chip on the row ("Your project: X").
//   why   — one sentence on what changed and what to do about it.
//
// Two passes, because they have different costs. Scoring is a few tokens per
// item and covers the newest SCORE_LIMIT; the sentence is not, so only the top
// WHY_LIMIT earn one. Both land in the same cached document, so the whole thing
// is one visit's worth of work per learner per day.
//
// The context is the four signals every other generator uses — tasks, goals,
// projects and tools (lib/learner-signals.js). This route used to read
// department/top_tasks/goal/tier only, which meant the "why this matters to you"
// line could not see the projects the learner had told us they were working on.
export const maxDuration = 60;

let client;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

const CACHE_TYPE = 'ai_news_why';

// Bump when the prompts or the stored shape change in a way that should discard
// yesterday's judgements. Without this, a tuning change reaches only learners who
// hadn't visited yet that day.
const CACHE_VERSION = 3;

// KEEP IN SYNC with RANKED_LIMIT / WHY_LIMIT in lib/news-personal.js — the page
// caps what it sends, and the page's "unranked" heading is drawn from the same
// numbers.
//
// This was 40, which left most of a 104-item feed sitting under a "Not ranked"
// heading: a bucket nobody had judged, offered to the reader as if it were a
// category. The whole practical feed now gets scored. It costs more batches, but
// they run concurrently (see below) so the reader waits for the slowest one
// rather than the sum, and the result is cached for the rest of the day.
const SCORE_LIMIT = 120;
const WHY_LIMIT = 12;

// Batch size for the scoring pass. Small enough that the model stays accurate
// across the list and the JSON can't outgrow max_tokens.
const SCORE_BATCH = 20;

function learnerContext(profile) {
  const bits = [];
  if (profile?.department) {
    bits.push(`They work in ${profile.department}${profile.sub_team ? ` (${profile.sub_team})` : ''}.`);
  }
  if (profile?.tier) bits.push(`Their AI comfort level: ${profile.tier}.`);

  // Tools are a first-class signal here. "OpenAI ships a new Codex mode" is a 20
  // for someone who only uses Gemini and an 80 for someone who lives in ChatGPT,
  // and no amount of task detail tells you which.
  const tools = chosenTools(profile).map((t) => t.label).filter(Boolean);
  if (tools.length) {
    bits.push(`The AI tools they actually use: ${tools.join(', ')}. News about a tool on this list lands much closer to their desk than news about one that is not.`);
  } else {
    bits.push('They have not picked their AI tools yet, so do not assume any particular one.');
  }

  const signals = buildSignalBlock(profile);
  return [bits.join(' '), signals].filter(Boolean).join('\n\n');
}

const NO_CONTEXT = 'No role, task or project details on file, so judge relevance for a general non-engineer employee at a home services software company and keep the scores middling rather than guessing high.';

const SCORE_SYSTEM = [
  'You rank AI news for ONE specific person at Housecall Pro, a home services software company.',
  'The audience is ordinary employees, marketers, support reps, ops and enablement people. They are NOT engineers or researchers.',
  '',
  'For each item, score 0-100: how much does this change what THIS person does at work?',
  '',
  'SCORING:',
  '90-100 — changes something they do this week. Names a tool they use, a task they listed, or a project they have in flight.',
  '70-89  — changes how they should work soon. A model or feature in their toolset that shifts how they prompt or which tool they reach for.',
  '40-69  — adjacent. Real for their kind of role, but not for their specific tasks or projects yet.',
  '10-39  — general AI news. True and mildly interesting, no action for them.',
  '0-9    — irrelevant to them. Engineering-only, hardware, market and funding news, corporate PR.',
  '',
  'Also give a MATCH: three to five words naming the single strongest reason for the score,',
  'in the learner\'s own vocabulary. Use their words for their tasks and projects, not paraphrases.',
  '  Good: "Your project: Video Maker", "Uses Claude daily", "Your goal: automation", "Not your toolset"',
  '  Bad: "Relevant", "Interesting development", "AI news"',
  'If the score is under 40, the match should say plainly why it is far from them.',
  '',
  'RULES:',
  '- Be honest and be willing to score low. A feed where everything is a 90 is a feed nobody trusts.',
  '- Do not reward an item for sounding important. Score it for what it changes for this one person.',
  '- Funding, valuations, chips, datacenters and hiring news score under 10 no matter how big the number.',
  '- Judge on the headline and blurb only. Never assume a capability the blurb does not state.',
  '',
  QUARANTINE_NOTE,
  '',
  'Return ONLY a JSON array (no markdown fences): [{"i": <1-based index>, "s": <0-100>, "m": "<match>"}]',
  'One object per item, same order.',
].join('\n');

const WHY_SYSTEM = [
  'You explain AI news to one specific person at Housecall Pro, in one sentence per item.',
  '',
  'For each item you are given an id, a headline and the publisher blurb. Return ONE sentence per id',
  'answering: what changed, and what it means for THIS person\'s work.',
  '',
  'RULES:',
  '- Lead with the consequence for them, not with a restatement of the headline. They can already read the headline.',
  '- Be concrete. "You can now paste a whole spreadsheet into one prompt instead of splitting it" beats "this improves capability".',
  '- Tie it to their actual work where it honestly fits: a task they listed, a project in flight, or a tool they use. Name the thing.',
  '- If it changes how they should PROMPT or which tool they should reach for, say that plainly. That is the most useful thing you can tell them.',
  '- If an item genuinely does not affect their work, say so in a short honest sentence. Do not invent relevance.',
  '- Never promise a feature the blurb does not state. You have only the headline and blurb.',
  '- Some items have NO blurb. Judge those from the headline alone and still say something useful about',
  '  what it means for them. NEVER write that you lack information, cannot assess relevance, or have no',
  '  blurb. The reader can see the headline too; a sentence about your own missing input tells them nothing.',
  '- One sentence. Maximum 30 words. No preamble, no "this article".',
  '',
  'STYLE: plain and warm. No em dashes or en dashes. No hype. Write "Housecall Pro" in full, never HCP.',
  '',
  QUARANTINE_NOTE,
  '',
  'Return ONLY valid JSON (no markdown fences): {"<id>": "<one sentence>", ...}',
].join('\n');

export async function POST(request) {
  const limited = await enforceRateLimit('ai-news/why', 'ai', request);
  if (limited) return limited;

  try {
    const base = await getAuthenticatedProfile();
    const email = base?.email;
    if (!email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Projects live under their own user-data key, so the profile alone never
    // carries them (lib/work-projects.js).
    const profile = await withProjects(base);

    const body = await request.json().catch(() => ({}));
    const items = (Array.isArray(body.items) ? body.items : [])
      .filter((i) => i?.id && i?.title)
      .slice(0, SCORE_LIMIT);
    if (!items.length) return NextResponse.json({ personal: {} });

    const dayKey = contentDayKey();
    const sig = signalSignature(profile);
    const cached = await getUserData(email, CACHE_TYPE).catch(() => null);

    // Reuse today's judgements, but only if they were made against the SAME
    // profile. Editing your tasks or adding a project has to re-rank the feed,
    // otherwise the page keeps serving the ordering built from who you were this
    // morning — the same trap Today's Pick fell into before signalSignature.
    const fresh = cached?.v === CACHE_VERSION && cached?.day === dayKey && cached?.sig === sig;
    const known = fresh && cached?.items ? { ...cached.items } : {};

    const context = learnerContext(profile) || NO_CONTEXT;

    // ---- pass 1: score + match, for anything not already judged today --------
    // The list grows during the day as the scan adds items, so a strict
    // "same day, same answer" cache would leave new arrivals permanently
    // unranked and stuck at the bottom of the page.
    const unscored = items.filter((i) => typeof known[i.id]?.score !== 'number');
    const batches = [];
    for (let i = 0; i < unscored.length; i += SCORE_BATCH) {
      batches.push(unscored.slice(i, i + SCORE_BATCH));
    }

    // Concurrently, not in sequence. The batches are independent — each scores
    // its own slice against the same context — so running them one after another
    // only made the reader wait longer. With the cap raised to cover the whole
    // feed that difference is the gap between a few seconds and half a minute
    // staring at the skeleton. scoreBatch never throws, so one bad batch leaves
    // its items unscored without taking the others down.
    let scored = 0;
    const results = await Promise.all(batches.map((b) => scoreBatch(b, context)));
    for (const judged of results) {
      for (const [id, value] of Object.entries(judged)) {
        known[id] = { ...known[id], ...value };
        scored++;
      }
    }

    // ---- pass 2: the sentence, for the top of the ranked list ---------------
    // Ranked across everything the learner asked about, not just what pass 1
    // touched, so a high scorer from yesterday still gets its sentence today.
    const top = items
      .filter((i) => typeof known[i.id]?.score === 'number')
      .sort((a, b) => known[b.id].score - known[a.id].score)
      .slice(0, WHY_LIMIT);
    const needWhy = top.filter((i) => !known[i.id]?.why);
    let explained = 0;
    if (needWhy.length) {
      const lines = await explain(needWhy, context);
      for (const [id, line] of Object.entries(lines)) {
        known[id] = { ...known[id], why: line };
        explained++;
      }
    }

    if (scored || explained) {
      await saveUserData(email, CACHE_TYPE, {
        v: CACHE_VERSION, day: dayKey, sig, items: known,
      }).catch(() => {});

      logAuditEntry({
        type: 'ai_news_why',
        endpoint: '/api/ai-news/why',
        user: { email, name: profile?.display_name || 'Unknown' },
        model: MODELS.haiku,
        input: { items: items.length, unscored: unscored.length, needWhy: needWhy.length },
        output: { scored, explained },
      }).catch(() => {});
    }

    return NextResponse.json({
      personal: pickFor(known, items),
      cached: !scored && !explained,
    });
  } catch (error) {
    console.error('POST /api/ai-news/why error:', error);
    // Soft-fail: the news list is still perfectly usable unranked, and the page
    // falls back to newest-first when nothing comes back.
    return NextResponse.json({ personal: {} });
  }
}

// One scoring batch. Never throws — a failed batch leaves those items unscored,
// which the page shows as "not ranked" rather than as a confident zero.
async function scoreBatch(batch, context) {
  try {
    const list = batch
      .map((i, n) => {
        const blurb = String(i.summary || '').slice(0, 200);
        return `${n + 1}. ${untrusted(i.title)}${blurb ? `\n   blurb: ${untrusted(blurb)}` : ''}`;
      })
      .join('\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 1200,
      system: SCORE_SYSTEM,
      messages: [{ role: 'user', content: `${context}\n\nScore these items:\n${list}` }],
    });

    const parsed = parseJson(response.content?.[0]?.text || '', '[');
    if (!Array.isArray(parsed)) return {};

    const out = {};
    for (const row of parsed) {
      const idx = Number(row?.i);
      // Validate the index against the batch we sent. The model is reading
      // quarantined feed text, so an out-of-range index is exactly what a
      // prompt-injection attempt would produce.
      if (!Number.isInteger(idx) || idx < 1 || idx > batch.length) continue;
      const item = batch[idx - 1];
      const score = Number(row?.s);
      if (!Number.isFinite(score)) continue;
      out[item.id] = {
        score: Math.max(0, Math.min(100, Math.round(score))),
        match: cleanMatch(row?.m),
      };
    }
    return out;
  } catch (err) {
    console.error('ai-news score batch failed:', err?.message || err);
    return {};
  }
}

// The "why this matters to you" sentences. Never throws — the rows simply carry
// their score and chip without a sentence.
async function explain(items, context) {
  try {
    // The blurb line is OMITTED when there isn't one, rather than sent empty.
    // Sending `blurb: <untrusted></untrusted>` told the model a field existed and
    // was blank, and it dutifully reported that back: rows from Hacker News and
    // Hugging Face, which ship no description, all read "No blurb provided to
    // assess relevance." A missing line just means judge from the headline.
    const list = items
      .map((i) => {
        const blurb = String(i.summary || '').slice(0, 400).trim();
        return [
          `id: ${i.id}`,
          `headline: ${untrusted(i.title)}`,
          blurb ? `blurb: ${untrusted(blurb)}` : null,
        ].filter(Boolean).join('\n');
      })
      .join('\n\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 1200,
      system: WHY_SYSTEM,
      messages: [{ role: 'user', content: `${context}\n\nItems:\n${list}` }],
    });

    const parsed = parseJson(response.content?.[0]?.text || '', '{');
    if (!parsed || typeof parsed !== 'object') return {};

    const allowed = new Set(items.map((i) => i.id));
    const out = {};
    for (const [id, value] of Object.entries(parsed)) {
      // Only ids we asked about — the model must not invent keys, and the
      // headlines it read are untrusted feed text.
      if (!allowed.has(id)) continue;
      const line = cleanSentence(value);
      if (line) out[id] = line;
    }
    return out;
  } catch (err) {
    console.error('ai-news why pass failed:', err?.message || err);
    return {};
  }
}

// Models occasionally wrap JSON in prose or fences despite the instruction.
function parseJson(text, opener) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(stripped);
  } catch {
    const closer = opener === '[' ? ']' : '}';
    const start = stripped.indexOf(opener);
    const end = stripped.lastIndexOf(closer);
    if (start === -1 || end <= start) return null;
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch { return null; }
  }
}

function pickFor(map, items) {
  const out = {};
  for (const i of items) {
    const entry = map[i.id];
    if (entry) out[i.id] = entry;
  }
  return out;
}

// Sentences that are about the MODEL's missing input rather than the reader's
// work. "No blurb provided to assess relevance" is not an explanation, it is an
// apology for not having one, and it shipped on every row from a source that
// publishes no description.
//
// The prompt now tells the model not to write these and the empty blurb line is
// no longer sent, but this is the guarantee: a non-answer is dropped, and the row
// renders cleanly with no "why" line at all. Better silent than hollow.
// Deliberately narrow. It matches the apology's own shape — a negation sitting
// directly on the missing input, or an explicit "cannot assess" — rather than
// any sentence that happens to contain "no" near "context", which would have
// eaten honest lines like "you keep the thread without missing context".
const NON_ANSWER = new RegExp([
  /\b(no|without|missing|insufficient|not enough)\s+(blurb|summary|description|information|details?)\b/.source,
  /\b(blurb|summary|description)\b[^.]{0,20}\b(not provided|not available|is empty|was missing)\b/.source,
  /\b(cannot|can't|unable to|not able to)\s+(\w+\s+){0,2}(assess|determine|evaluate|judge)\b/.source,
].join('|'), 'i');

// House style enforced in code, not merely requested in the prompt.
function cleanSentence(value) {
  if (typeof value !== 'string') return null;
  const out = normalize(value);
  if (!out) return null;
  if (NON_ANSWER.test(out)) return null;
  return out.slice(0, 240);
}

// The chip sits in a row of pills, so it has to stay short whatever the model
// returns. Truncating at a word boundary rather than mid-word.
function cleanMatch(value) {
  if (typeof value !== 'string') return null;
  const out = normalize(value);
  if (!out) return null;
  if (out.length <= 40) return out;
  return `${out.slice(0, 40).replace(/\s+\S*$/, '')}…`;
}

function normalize(value) {
  return value
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\bHCP\b/g, 'Housecall Pro')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
