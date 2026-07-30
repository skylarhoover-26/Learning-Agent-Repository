import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from './models';
import { AI_TOOLS } from './ai-tools';

// Bump whenever the rubric below changes in a way that should re-judge existing
// findings. The scan re-classifies anything stamped with an older version, so a
// tuning change reaches the whole stored list instead of only new items.
export const RUBRIC_VERSION = 2;

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
  'vendor_pitch',     // marketing for a product the audience would have to adopt
  'dev_tooling',      // SDKs, libraries, APIs, frameworks — for engineers
  'business',         // funding, valuations, market/stock, hiring, corporate PR
  'policy_legal',     // regulation, lawsuits, politics
  'research',         // papers, benchmarks, academic results
  'infrastructure',   // datacenters, chips, serving, internal engineering
  'hardware_gadget',  // consumer devices, wearables
  'industry_news',    // general reporting, opinion, speculation, roadmap gossip
  'other',
];

// The tools this audience actually has, straight from the catalog in
// lib/ai-tools.js — so 'a tool people use' means the real approved list rather
// than whatever the model assumes, and it stays correct if the catalog changes.
const TOOL_NAMES = AI_TOOLS.map((t) => t.label).join(', ');

const SYSTEM_PROMPT = [
  'You classify AI news headlines for an internal learning platform at Housecall Pro,',
  'a home-services software company. The audience is ordinary employees — marketers,',
  'support reps, ops — building practical AI skills. They are NOT engineers or researchers.',
  '',
  'Assign each headline EXACTLY ONE category:',
  '',
  'model_change — a model is released, updated, deprecated, repriced, or its limits change.',
  '  e.g. "Advancing the price-performance frontier with GPT-5.6", "Introducing Gemini 3.6 Flash"',
  `tool_feature — a new capability in a mainstream AI ASSISTANT this audience already`,
  `  has or could open today with no procurement. The tools they actually use are:`,
  `  ${TOOL_NAMES}. Other everyday assistants (Perplexity, Notion AI) count too.`,
  '  The test is "could a marketer open this tomorrow and use the new thing?"',
  '  e.g. "Launching Health in ChatGPT", "Microsoft confirms Copilot super app"',
  'prompt_practice — prompting technique, workflow craft, or how-to guidance the reader',
  '  can apply themselves with a tool they already have. Genuinely instructional, not a',
  '  product announcement dressed as advice.',
  '  e.g. "How enabling two settings tripled our scores", "How AI is expanding what',
  '  people do at work"',
  'safety_practice — CONSTRUCTIVE guidance on using AI responsibly: verifying output,',
  '  habits around confidential information, avoiding over-reliance. Must be advice the',
  '  reader can act on, framed as good practice.',
  '',
  'vendor_pitch — the item exists to SELL a product the audience would have to adopt.',
  '  Marketing language ("system of record", "iterate fast, ship with control",',
  '  "the foundation for X"), a company introducing a platform/studio/enterprise',
  '  product, or any "you need <product>" framing. This applies EVEN to the big labs:',
  '  a feature inside a tool they already use is tool_feature, but a pitch for a new',
  '  product they would have to go get is vendor_pitch.',
  '  e.g. "Your Prompts and Skills need a system of record" (selling Mistral Studio),',
  '  "Introducing physics AI at Mistral: the foundation for engineering acceleration"',
  'dev_tooling — SDKs, libraries, APIs, frameworks, self-hosting, model weights, or',
  '  anything requiring code to use. The audience does not write software.',
  '  e.g. "Go LLM SDK for streaming, tool-calling AI backends (plus frontend React lib)"',
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
  '- Read the blurb when one is given. A promotional blurb under an advice-sounding',
  '  headline makes the item vendor_pitch, not prompt_practice.',
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
  // The SUMMARY is what makes vendor_pitch detectable. "Your Prompts and Skills
  // need a system of record" reads like genuine advice from the title alone — it's
  // the blurb ("Studio provides a system of record… iterate fast, ship with
  // control") that reveals it as product marketing. Classifying on titles only put
  // that straight onto the home page as prompt_practice.
  const list = batch
    .map((f, i) => {
      const head = `${i + 1}. [${f.sourceName}] ${f.title}`;
      const blurb = (f.summary || '').slice(0, 160);
      return blurb ? `${head}\n   blurb: ${blurb}` : head;
    })
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
  return batch.map((f, i) => ({
    ...f,
    category: byIndex.get(i + 1) || 'other',
    catV: RUBRIC_VERSION,
  }));
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
      out.push(...batch.map((f) => ({ ...f, category: 'unclassified', catV: RUBRIC_VERSION })));
    }
  }
  return out;
}
