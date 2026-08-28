// What the learner reads while a lesson is being generated.
//
// WHY THIS EXISTS. Lesson generation is the longest wait in the app — FORMAT_LOAD
// in components/plan-lesson-player.jsx promises 45-75 seconds for a Quick Tip and
// 2.5-4 minutes for a Project Quest, and the loader gave that whole window a book
// animation and a status line. Video games solved this decades ago: fill the wait
// with something worth reading, and say out loud that the thing being built is
// being built for THIS person.
//
// PURE MODULE — no storage, no fetch, no LLM. Deliberately: this is the one screen
// that must never fail, so the tips can't depend on a network call that might not
// come back. Personalization comes from FILTERING the pool against the learner's
// own tools and tier, not from generating text at load time.
//
// Tag rules for a tip:
//   tools — tool ids it only makes sense for (see lib/ai-tools.js). Empty = anyone.
//   tier  — tiers it only makes sense for. Empty = anyone.
//   kind  — 'craft' (how to work with AI) or 'platform' (how this app works).
//
// Only claim a platform behaviour that actually ships. Every 'platform' tip below
// maps to real code: pausing (lib/paused-lessons.js), the in-lesson chat box and
// the games catalog. A tip promising something we don't do is worse than no tip.

import { chosenTools } from './ai-tools';
import { readSignals } from './learner-signals';
import { formatLabel } from './lesson-formats';

export const TIPS = [
  // ---- Craft: framing the ask ---------------------------------------------
  { id: 'role-first', kind: 'craft', tools: [], tier: [], text: "Tell it who it is before you tell it what to do. “You are a support lead writing to a frustrated customer” changes the answer more than any other words you add." },
  { id: 'show-example', kind: 'craft', tools: [], tier: [], text: 'Paste one example of what good looks like. A sample of your own writing beats three paragraphs describing your tone.' },
  { id: 'name-the-format', kind: 'craft', tools: [], tier: [], text: "Ask for the shape you want — a table, five bullets, a 200-word email — or you'll get a wall of prose." },
  { id: 'state-the-use', kind: 'craft', tools: [], tier: [], text: "Say what the output is for. “This goes in a customer email” and “these are my notes” produce very different drafts." },
  { id: 'new-hire-brief', kind: 'craft', tools: [], tier: [], text: 'Brief it like a new hire: audience, deadline, tone, and what to stay away from.' },
  { id: 'three-options', kind: 'craft', tools: [], tier: [], text: 'Ask for three options instead of one. Picking is faster than editing.' },
  { id: 'let-it-ask', kind: 'craft', tools: [], tier: [], text: "“Ask me anything you need before you start” turns one bad draft into one good one." },

  // ---- Craft: iterating ----------------------------------------------------
  { id: 'keep-and-change', kind: 'craft', tools: [], tier: [], text: "When the first answer is close but wrong, don't start over. Say what to keep and what to change." },
  { id: 'self-critique', kind: 'craft', tools: [], tier: [], text: "Before you accept an answer, ask it: “What's the weakest part of this?”" },
  { id: 'show-the-miss', kind: 'craft', tools: [], tier: [], text: "If it keeps missing, show it the bad answer and say exactly why it's bad. Correction beats repetition." },
  { id: 'split-the-ask', kind: 'craft', tools: [], tier: [], text: 'Break one giant request into three small ones. Quality falls off long before the context window does.' },
  { id: 'fresh-chat', kind: 'craft', tools: [], tier: [], text: 'Start a fresh chat when you switch topics. Old context bleeds into new answers.' },
  { id: 'specific-question', kind: 'craft', tools: [], tier: [], text: 'The fastest fix for a vague answer is a more specific question.' },

  // ---- Craft: grounding and judgement --------------------------------------
  { id: 'paste-the-source', kind: 'craft', tools: [], tier: [], text: 'Long context beats clever wording. Paste the doc, the thread, the numbers, then ask.' },
  { id: 'why-it-invents', kind: 'craft', tools: [], tier: [], text: "It makes things up when you ask a question your context can't answer. Give it the source and the guessing stops." },
  { id: 'first-drafter', kind: 'craft', tools: [], tier: [], text: "It's a first-drafter, not a fact-checker. Verify anything you'd be embarrassed to be wrong about." },
  { id: 'counterargument', kind: 'craft', tools: [], tier: [], text: 'Ask for the counterargument. It is the cheapest way to pressure-test a plan.' },
  { id: 'reading-level', kind: 'craft', tools: [], tier: [], text: "“Rewrite this so a new hire understands it” is the fastest clarity edit there is." },
  { id: 'redact-first', kind: 'craft', tools: [], tier: [], text: 'Redact names, account numbers and customer data before you paste. Same rule you would apply to a shared doc.' },

  // ---- Craft: habit --------------------------------------------------------
  { id: 'save-your-prompts', kind: 'craft', tools: [], tier: [], text: "Save the prompts that work. A prompt you rewrite from scratch every time is a prompt you haven't finished." },
  { id: 'second-window', kind: 'craft', tools: [], tier: [], text: 'Keep your AI tool open in a second window while you work. The habit matters more than the technique.' },
  { id: 'smallest-real-task', kind: 'craft', tools: [], tier: [], text: 'Pick the smallest real task on your list to try this on. Practice on live work sticks; practice on made-up work does not.' },

  // ---- Developer tier ------------------------------------------------------
  { id: 'error-code-expected', kind: 'craft', tools: [], tier: ['developer'], text: 'Give it the error, the code and what you expected. Two out of three is never enough.' },
  { id: 'tests-first', kind: 'craft', tools: [], tier: ['developer'], text: 'Ask for the tests first when you want the implementation to be right.' },

  // ---- Tool-specific -------------------------------------------------------
  { id: 'claude-long-docs', kind: 'craft', tools: ['claude', 'claude_code', 'claude_cowork'], tier: [], text: 'Claude handles long documents well. Paste the whole thing rather than summarizing it down first.' },
  { id: 'claude-code-read-first', kind: 'craft', tools: ['claude_code'], tier: [], text: "Claude Code can read your repo. Ask it “where does this happen?” before you ask it to change anything." },
  { id: 'chatgpt-custom-instructions', kind: 'craft', tools: ['chatgpt'], tier: [], text: 'Custom instructions in ChatGPT save you retyping your role and context at the top of every chat.' },
  { id: 'gemini-drive', kind: 'craft', tools: ['gemini'], tier: [], text: 'Gemini can read straight from your Drive. Point it at the doc instead of pasting the doc.' },
  { id: 'copilot-comment', kind: 'craft', tools: ['github_copilot'], tier: [], text: 'Copilot writes better from a comment describing the intent than from a function name alone.' },
  { id: 'n8n-pin-data', kind: 'craft', tools: ['n8n'], tier: [], text: 'In n8n, pin sample data on a node while you build so you are not re-running the whole workflow to test one step.' },
  { id: 'zapier-test-steps', kind: 'craft', tools: ['zapier'], tier: [], text: 'In Zapier, test every step with real data before you turn the Zap on. A silent failure looks exactly like success.' },
  { id: 'elevenlabs-punctuation', kind: 'craft', tools: ['elevenlabs'], tier: [], text: 'In ElevenLabs, punctuation is direction. Commas and full stops control pacing more than any slider does.' },
  { id: 'vapi-script', kind: 'craft', tools: ['vapi'], tier: [], text: 'Vapi calls break on ambiguity. Write the system prompt like a script, not like a description.' },
  { id: 'langsmith-trace', kind: 'craft', tools: ['langsmith'], tier: [], text: 'In LangSmith, trace one bad run end to end before you touch the prompt. The failure is usually upstream of where it shows.' },

  // ---- Platform ------------------------------------------------------------
  { id: 'pause-resume', kind: 'platform', tools: [], tier: [], text: 'You can pause a lesson part-way and pick it up later. Your place is saved.' },
  { id: 'ask-mid-lesson', kind: 'platform', tools: [], tier: [], text: 'Stuck on a step? Ask in the chat box inside the lesson. It answers in context instead of starting over.' },
  { id: 'built-per-learner', kind: 'platform', tools: [], tier: [], text: 'Nothing here is off a shelf. Every lesson is written for your role, your tools and the work you said you are doing.' },
  { id: 'games-are-practice', kind: 'platform', tools: [], tier: [], text: 'The games are real practice, not filler. They are generated from the same topics as your lessons.' },
];

// How long the whole build typically runs, per format, in seconds. Used only to
// PACE the build checklist below — the honest estimate a learner reads still comes
// from FORMAT_LOAD in components/plan-lesson-player.jsx. Roughly the midpoint of
// each band there, so the checklist advances at the speed of the real thing.
const BUILD_PACE = {
  quick_tip: 60,
  standard: 105,
  deep_dive: 145,
  project_quest: 200,
};

// The real pipeline behind the loader, in order: tool recommendation, the grounding
// doc lookup, the plan, then the first teach step. Named honestly so the checklist
// reports what is happening rather than inventing reassuring stages.
export const BUILD_STEPS = [
  { key: 'profile', label: 'Reading your role, tools and projects', at: 0 },
  { key: 'research', label: 'Looking up current sources on the topic', at: 0.1 },
  { key: 'plan', label: 'Designing the steps and objectives', at: 0.35 },
  { key: 'write', label: 'Writing your first section', at: 0.65 },
];

export function buildPace(format) {
  return BUILD_PACE[format] || BUILD_PACE.standard;
}

/**
 * Which build step is in flight at `elapsed` seconds.
 *
 * The last stage is never reported as finished — the completed lesson unmounting
 * the loader is what finishes it. Same rule the progress bar follows: claiming
 * everything is done while you still wait reads as stuck.
 */
export function currentStage(elapsed, format) {
  const frac = elapsed / buildPace(format);
  let active = BUILD_STEPS[0];
  BUILD_STEPS.forEach((step) => {
    if (frac >= step.at) active = step;
  });
  return active;
}

/**
 * The single grey line under the progress bar.
 *
 * This deliberately carries THREE things that each used to have their own block:
 * which stage is running (was a four-row checklist), how long it usually takes,
 * and the warning that leaving the tab pauses the build. Stacked separately they
 * repeated the bar and each other; the loader read as busy and none of the three
 * got read properly. One sentence, one weight.
 *
 * @param {number} elapsed seconds since the build started
 * @param {string} format lesson format
 * @param {string} estimate the caller's honest "usually takes" string
 * @param {{slow?: number}} options seconds after which to stop quoting the estimate
 */
export function statusLine(elapsed, format, estimate, options = {}) {
  const stage = currentStage(elapsed, format).label;
  const timing = options.slow && elapsed >= options.slow
    ? 'taking a little longer than usual, hang tight'
    : `about ${estimate}`;
  return `${stage} · ${timing} · keep this tab open, leaving pauses it`;
}

function toolIds(profile) {
  return chosenTools(profile).map((t) => t.id);
}

// Fisher-Yates over a copy — never shuffles the exported TIPS array in place.
function shuffled(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The tips this learner should see, in the order to show them.
 *
 * Tool-specific tips go FIRST — they are the ones that read as "this was picked
 * for me" — then everything else, shuffled so the same person waiting twice does
 * not get the same reel. Platform tips are capped at one so the wait teaches AI
 * rather than advertising the app back at the person already using it.
 *
 * @param {object} profile learner profile (may be null — returns generic tips)
 * @param {{count?: number}} options
 * @returns {Array<{id: string, text: string}>}
 */
export function pickTips(profile, options = {}) {
  const count = options.count || 8;
  const ids = toolIds(profile);
  const tier = profile?.tier || '';

  const eligible = TIPS.filter((tip) => {
    if (tip.tier.length && !tip.tier.includes(tier)) return false;
    if (tip.tools.length && !tip.tools.some((id) => ids.includes(id))) return false;
    return true;
  });

  const toolTips = shuffled(eligible.filter((t) => t.tools.length));
  const platform = shuffled(eligible.filter((t) => !t.tools.length && t.kind === 'platform')).slice(0, 1);
  const craft = shuffled(eligible.filter((t) => !t.tools.length && t.kind === 'craft'));

  return [...toolTips, ...platform, ...craft].slice(0, count);
}

/**
 * The "we're building this for you" line above the tips.
 *
 * Reaches for the most concrete signal the learner has given us — an active
 * project, then a day-to-day task, then their department — because "built around
 * your Q3 onboarding revamp" lands and "personalized for you" does not. Returns a
 * plain, honest line when we know nothing rather than faking familiarity.
 */
export function personalLine(profile, format) {
  const label = formatLabel(format);
  const { tasks, projects, department } = readSignals(profile);
  const name = String(profile?.display_name || '').trim().split(' ')[0];
  const who = name ? `, ${name}` : '';

  if (projects.length) return `Building this ${label} around ${projects[0].title}${who}.`;
  if (tasks.length) return `Building this ${label} around your work on ${tasks[0]}${who}.`;
  if (department) return `Building this ${label} for ${department}${who}.`;
  return `Building this ${label} just for you${who}.`;
}
