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
import { BAND_IDS, scoreForBand } from '@/lib/news-personal';

// Ranks the AI-news feed against ONE learner, and explains every item in it.
//
// The news list shows the publisher's own blurb, which summarises the ARTICLE.
// Testers asked for the opposite: not what the article says, but what changed and
// why it lands on their desk, and for the feed to LEAD with the items that do
// (feedback #145). So this returns three things per item:
//
//   band  — one of five verdicts, from changes_now down to irrelevant. Drives the
//           lanes, via the score lib/news-personal.js maps it to.
//   match — the short reason, for the chip on the row ("Your project: X").
//   why   — one sentence on what changed and what to do about it.
//
// A band rather than a 0-100 number, because the number was never as precise as
// it looked: an item scored 72 one run and 68 the next crossed a lane boundary
// on a distinction the model cannot hold. Between that, temperature 0 and a
// stable batch order, a re-run of the same feed against the same profile should
// now land in the same place.
//
// All three in ONE pass, batched and run concurrently. It was two passes at
// first — score everything cheaply, then write sentences for the top twelve —
// which was the right shape while most of the feed went unexplained. Once every
// ranked item earned a sentence, reading the same hundred headlines twice to
// produce two halves of one judgement was pure waste.
//
// A low score still gets a real sentence: "this is aimed at engineers building
// their own agents, not at your enablement work" is exactly what lets someone
// skip an item with confidence, which is most of what a news feed owes a reader.
//
// The whole result is cached per learner per content-day, so this is one visit's
// worth of work per person per day.
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
const CACHE_VERSION = 5;

// KEEP IN SYNC with RANKED_LIMIT in lib/news-personal.js — the page caps what it
// sends, and the page's "unranked" heading is drawn from the same number.
//
// This was 40, which left most of a 104-item feed sitting under a "Not ranked"
// heading: a bucket nobody had judged, offered to the reader as if it were a
// category. The whole practical feed now gets judged. It costs more batches, but
// they run concurrently (see below) so the reader waits for the slowest one
// rather than the sum, and the result is cached for the rest of the day.
const SCORE_LIMIT = 120;

// Batch size. Smaller than the old scoring batch of 20 because each row now
// carries a sentence as well as a score, so the output per batch is several times
// larger. Smaller batches also mean more of them running at once, which is what
// keeps the wait flat as the item count grows.
const JUDGE_BATCH = 10;

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

const JUDGE_SYSTEM = [
  'You rank AI news for ONE specific person at Housecall Pro, a home services software company.',
  'The audience is ordinary employees, marketers, support reps, ops and enablement people. They are NOT engineers or researchers.',
  '',
  'For each item, choose EXACTLY ONE band: how much does this change what THIS person does at work?',
  '',
  'BANDS:',
  'changes_now — changes something they do this week. Names a tool they use, a task they listed, or a project they have in flight.',
  'soon        — changes how they should work soon. A model or feature in their toolset that shifts how they prompt or which tool they reach for.',
  'adjacent    — real for their kind of role, but not for their specific tasks or projects yet.',
  'general     — true and mildly interesting, no action for them.',
  'irrelevant  — no connection to them. Engineering-only, hardware, market and funding news, corporate PR.',
  '',
  'Judge each item ON ITS OWN against these bands. Do NOT grade on a curve, do NOT',
  'compare the items in this list to each other, and do not spread them across the bands',
  'to get a nice distribution. If all ten are irrelevant to this person, all ten are',
  'irrelevant. The same headline must land in the same band whatever else it appears beside.',
  '',
  'Also give a MATCH: three to five words naming the single strongest reason for the band,',
  'in the learner\'s own vocabulary. Use their words for their tasks and projects, not paraphrases.',
  '  Good: "Your project: Video Maker", "Uses Claude daily", "Your goal: automation", "Not your toolset"',
  '  Bad: "Relevant", "Interesting development", "AI news"',
  'For general or irrelevant, the match should say plainly why it is far from them.',
  '',
  'And give a WHY: ONE sentence answering what changed and what it means for THIS person\'s work.',
  '- Lead with the consequence for them, not a restatement of the headline. They can already read the headline.',
  '- Be concrete. "You can now paste a whole spreadsheet into one prompt instead of splitting it" beats "this improves capability".',
  '- Tie it to their actual work where it honestly fits: a task they listed, a project in flight, or a tool they use. Name the thing.',
  '- If it changes how they should PROMPT or which tool they should reach for, say that plainly. That is the most useful thing you can tell them.',
  '- A LOW band still gets a real sentence. "This is aimed at engineers building their own agents, not at your',
  '  enablement work" is useful; it tells them why they can skip it. Do not invent relevance to fill the space.',
  '- Never promise a feature the blurb does not state. You have only the headline and blurb.',
  '- Some items have NO blurb. Judge those from the headline alone and still say something useful about',
  '  what it means for them. NEVER write that you lack information, cannot assess relevance, or have no',
  '  blurb. The reader can see the headline too; a sentence about your own missing input tells them nothing.',
  '- One sentence. Maximum 30 words. No preamble, no "this article".',
  '',
  'RULES:',
  '- Be honest and be willing to band low. A feed where everything is changes_now is a feed nobody trusts.',
  '- Do not reward an item for sounding important. Band it for what it changes for this one person.',
  '- Funding, valuations, chips, datacenters and hiring news are irrelevant no matter how big the number.',
  '- Judge on the headline and blurb only. Never assume a capability the blurb does not state.',
  '',
  'STYLE: plain and warm. No em dashes or en dashes. No hype. Write "Housecall Pro" in full, never HCP.',
  '',
  QUARANTINE_NOTE,
  '',
  'Return ONLY a JSON array (no markdown fences):',
  '[{"i": <1-based index>, "b": "<band>", "m": "<match>", "w": "<one sentence>"}]',
  'One object per item, same order. "b" must be exactly one of:',
  `  ${BAND_IDS.join(', ')}`,
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

    // Score, match and sentence in ONE pass over anything not already judged
    // today. The list grows during the day as the scan adds items, so a strict
    // "same day, same answer" cache would leave new arrivals permanently
    // unranked and stuck at the bottom of the page.
    //
    // This used to be two passes: score everything cheaply, then write sentences
    // for the top twelve only. That was the right shape when most of the feed
    // went unexplained, but every ranked item now earns a sentence, and reading
    // the same 100 headlines twice to produce two halves of one judgement is pure
    // waste. One pass, one read, both halves.
    // Keyed on the SCORE, not on the sentence. A score is set for every item the
    // model judged, whereas the sentence can legitimately come back empty — the
    // non-answer guard in cleanSentence drops hollow ones. Filtering on `why`
    // would send those items back to the model on every single visit, paying for
    // a fresh call all day to re-derive a line we are going to discard again.
    const unjudged = items
      .filter((i) => typeof known[i.id]?.score !== 'number')
      // Sorted by id, NOT left in the order the page happened to send them.
      // Batch composition was drifting run to run as items got cached, so the
      // same headline kept landing beside different neighbours. Even with the
      // "judge each item on its own" instruction, identical inputs are the only
      // way to expect identical outputs — a stable sort makes a re-run
      // reproducible rather than merely similar.
      .slice()
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const batches = [];
    for (let i = 0; i < unjudged.length; i += JUDGE_BATCH) {
      batches.push(unjudged.slice(i, i + JUDGE_BATCH));
    }

    // Concurrently, not in sequence. The batches are independent — each judges
    // its own slice against the same context — so running them one after another
    // only made the reader wait longer. Covering the whole feed that way would be
    // the difference between a few seconds and half a minute staring at the
    // skeleton. judgeBatch never throws, so one bad batch leaves its items
    // unjudged without taking the others down.
    let judged = 0;
    const results = await Promise.all(batches.map((b) => judgeBatch(b, context)));
    for (const batchResult of results) {
      for (const [id, value] of Object.entries(batchResult)) {
        known[id] = { ...known[id], ...value };
        judged++;
      }
    }

    if (judged) {
      await saveUserData(email, CACHE_TYPE, {
        v: CACHE_VERSION, day: dayKey, sig, items: known,
      }).catch(() => {});
    }

    // Logged whenever there was work to do, INCLUDING when none of it succeeded.
    // This used to sit inside `if (judged)`, which meant a run where every batch
    // came back empty wrote no record at all — so a total ranking failure looked
    // exactly like a cache hit, and a page showing 22 of 23 items unranked left
    // nothing behind to explain why. `failed` is the number that went to the
    // model and came back unusable.
    if (unjudged.length) {
      logAuditEntry({
        type: 'ai_news_why',
        endpoint: '/api/ai-news/why',
        user: { email, name: profile?.display_name || 'Unknown' },
        model: MODELS.haiku,
        input: { items: items.length, unjudged: unjudged.length, batches: batches.length },
        output: { judged, failed: unjudged.length - judged },
      }).catch(() => {});
    }

    return NextResponse.json({
      personal: pickFor(known, items),
      cached: !judged,
    });
  } catch (error) {
    console.error('POST /api/ai-news/why error:', error);
    // Soft-fail: the news list is still perfectly usable unranked, and the page
    // falls back to newest-first when nothing comes back.
    return NextResponse.json({ personal: {} });
  }
}

// One judging batch: score, match and sentence for each item in the slice.
// Never throws — a failed batch leaves those items unjudged, which the page shows
// as "not ranked" rather than as a confident zero.
async function judgeBatch(batch, context) {
  try {
    // The blurb line is OMITTED when there isn't one, rather than sent empty.
    // Sending `blurb: <untrusted></untrusted>` told the model a field existed and
    // was blank, and it dutifully reported that back: rows from Hacker News and
    // Hugging Face, which ship no description, all read "No blurb provided to
    // assess relevance." A missing line just means judge from the headline.
    const list = batch
      .map((i, n) => {
        const blurb = String(i.summary || '').slice(0, 300).trim();
        return `${n + 1}. ${untrusted(i.title)}${blurb ? `\n   blurb: ${untrusted(blurb)}` : ''}`;
      })
      .join('\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      // Room for a band, a chip and a 30-word sentence per item, with headroom
      // so the JSON is never truncated mid-object.
      max_tokens: 2000,
      // The single biggest source of the drift this replaced: at the SDK default
      // of 1.0 the same headline and the same profile could come back in
      // different bands on consecutive runs. Nothing here benefits from
      // creativity — it is a classification against a fixed rubric.
      temperature: 0,
      system: JUDGE_SYSTEM,
      messages: [{ role: 'user', content: `${context}\n\nJudge these items:\n${list}` }],
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
      // The band must be one we defined. A value off the list means the model
      // invented a category — quite possibly because it was told to by the
      // quarantined feed text — so the item stays unjudged rather than being
      // filed under a guess.
      const score = scoreForBand(row?.b);
      if (score === null) continue;
      out[item.id] = {
        band: String(row.b).trim().toLowerCase(),
        score,
        match: cleanMatch(row?.m),
        why: cleanSentence(row?.w),
      };
    }
    return out;
  } catch (err) {
    console.error('ai-news judge batch failed:', err?.message || err);
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
