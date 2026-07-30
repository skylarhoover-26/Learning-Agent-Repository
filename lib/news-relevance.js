import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from './models';

// Relevance guardrails for the AI-news feed.
//
// The scan's existing filterUnsafeContent only asks "is this AI/tech related",
// which is a very low bar — it happily passed "AI's finally expensive enough to
// make Wall Street nervous" and "Samsung's chip workers are jumping ship". This
// classifies each headline so the learner-facing surfaces can show only what
// actually changes how someone works.
//
// Every finding gets a category, and almost nothing is thrown away — the display
// layer decides what to show (APPROVED_CATEGORIES in lib/ai-news.js), so the
// rubric can be retuned without re-scanning.
//
// The one exception is security_incident, which is DISCARDED at scan time rather
// than stored hidden (EXCLUDED_CATEGORIES). Hidden wasn't enough: /ai-news is a
// normal learner page with a "show everything" toggle, so a breach headline sitting
// in the blob was still one click from being read. It must never be stored, so the
// classifier still needs to recognise it accurately.

export const CATEGORIES = [
  // ---- shown to learners ----
  'model_change',     // new/updated/deprecated models, pricing, rate limits
  'tool_feature',     // new capability in a tool people use (ChatGPT, Claude, Gemini, Copilot…)
  'prompt_practice',  // prompting technique, workflow craft, how-to
  'safety_practice',  // constructive habits: check outputs, care with sensitive info

  // ---- DISCARDED at scan time (EXCLUDED_CATEGORIES in lib/ai-news.js) ----
  'security_incident',// attacks, breaches, exploits, vulnerabilities — never stored

  // ---- stored but hidden; reachable via "show everything" on /ai-news ----
  'business',         // funding, valuations, market/stock, hiring, corporate PR
  'policy_legal',     // regulation, lawsuits, politics
  'research',         // papers, benchmarks, academic results
  'infrastructure',   // datacenters, chips, serving, internal engineering
  'hardware_gadget',  // consumer devices, wearables
  'industry_news',    // general reporting, opinion, speculation, roadmap gossip
  'other',
];

const SYSTEM_PROMPT = [
  'You classify AI news headlines for an internal learning platform at Housecall Pro,',
  'a home-services software company. The audience is ordinary employees — marketers,',
  'support reps, ops — building practical AI skills. They are NOT engineers or researchers.',
  '',
  'Assign each headline EXACTLY ONE category:',
  '',
  'model_change — a model is released, updated, deprecated, repriced, or its limits change.',
  '  e.g. "Advancing the price-performance frontier with GPT-5.6", "Introducing Gemini 3.6 Flash"',
  'tool_feature — a new capability in a tool a normal person uses: ChatGPT, Claude, Gemini,',
  '  Copilot, Perplexity, Mistral, Notion AI, etc.',
  '  e.g. "Launching Health in ChatGPT", "Microsoft confirms Copilot super app"',
  'prompt_practice — prompting technique, workflow craft, or how-to guidance.',
  '  e.g. "Your Prompts and Skills need a system of record"',
  'safety_practice — CONSTRUCTIVE guidance on using AI responsibly: verifying output,',
  '  habits around confidential information, avoiding over-reliance. Must be advice the',
  '  reader can act on, framed as good practice.',
  '',
  'security_incident — attacks, breaches, exploits, jailbreaks, vulnerabilities, leaks.',
  '  This is NOT safety_practice. Anything whose main content is "something bad happened"',
  '  or "this system can be broken" belongs here, even if a lesson could be drawn from it.',
  '  e.g. "A fundamental flaw leaves LLMs strikingly vulnerable to attack"',
  'business — funding, valuations, stock, market commentary, hiring, partnerships, corporate PR.',
  '  e.g. "AI is finally expensive enough to make Wall Street nervous", "$40M commitment"',
  'policy_legal — regulation, lawsuits, government, politics.',
  'research — papers, benchmarks, academic or scientific results.',
  'infrastructure — datacenters, chips, storage, serving, internal engineering.',
  'hardware_gadget — consumer devices, wearables, robots.',
  'industry_news — general reporting, opinion, predictions, roadmap speculation.',
  'other — anything else, including items unrelated to AI.',
  '',
  'Rules:',
  '- Judge by the MAIN SUBJECT, not by whether the words sound AI-ish.',
  '- A company announcement about community investment or national initiatives is business,',
  '  not tool_feature, even from OpenAI or Google.',
  '- Robotics and self-driving are hardware_gadget unless the audience could use it at a desk.',
  '- Prefer the stricter, less flattering category when torn. Showing an irrelevant item',
  '  costs more trust than hiding a borderline one.',
  '',
  'Return ONLY a JSON array of objects: [{"i": <1-based index>, "c": "<category>"}]',
  'One object per headline, same order. No prose, no code fences.',
].join('\n');

// Batch size per call. Small enough that the model stays accurate over the list
// and the JSON can't outgrow max_tokens.
const BATCH = 25;

function getClient() {
  return new Anthropic();
}

async function classifyBatch(batch) {
  const list = batch
    .map((f, i) => `${i + 1}. [${f.sourceName}] ${f.title}`)
    .join('\n');
  const res = await getClient().messages.create({
    model: MODELS.haiku,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Classify these headlines:\n${list}` }],
  });
  const text = res.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\[[\s\S]*\]/);
    parsed = m ? JSON.parse(m[0]) : null;
  }
  if (!Array.isArray(parsed)) return batch;

  const byIndex = new Map();
  for (const row of parsed) {
    const idx = Number(row?.i);
    const cat = String(row?.c || '').trim();
    if (Number.isInteger(idx) && CATEGORIES.includes(cat)) byIndex.set(idx, cat);
  }
  // An unclassified item keeps 'other' — hidden by default rather than shown,
  // so a partial model response can never leak noise onto the home page.
  return batch.map((f, i) => ({ ...f, category: byIndex.get(i + 1) || 'other' }));
}

// Tags each finding with a `category`. Returns a NEW array; never throws — on
// failure the findings come back with category 'unclassified' so they're
// identifiable (and hidden) rather than silently treated as approved.
export async function classifyFindings(findings) {
  if (!findings?.length) return findings || [];
  const out = [];
  for (let i = 0; i < findings.length; i += BATCH) {
    const batch = findings.slice(i, i + BATCH);
    try {
      out.push(...(await classifyBatch(batch)));
    } catch (err) {
      console.error('news relevance classification failed:', err?.message || err);
      out.push(...batch.map((f) => ({ ...f, category: 'unclassified' })));
    }
  }
  return out;
}
