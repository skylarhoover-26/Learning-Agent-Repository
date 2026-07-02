import { MODELS } from './models';
import { buildToolGuidance, resolveTools } from './ai-tools';
import { getMergedTools } from './ai-tools-store';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = MODELS.sonnet;

let client;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export function buildChatSystemPrompt(learnerProfile, catalog) {
  const { display_name, department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';

  const tasksContext = Array.isArray(top_tasks) && top_tasks.length > 0
    ? `- Their day-to-day tasks: ${top_tasks.join(', ')}. Reference these when suggesting AI applications.`
    : null;

  return [
    'You are a friendly, concise AI coach on an internal learning platform.',
    'Your primary job is to help people discover how to USE AI in their actual work — not just explain topics abstractly.',
    'Rules:',
    '- Keep responses to 4-6 lines max.',
    '- Use **bold**, bullets, and `code` formatting for clarity.',
    '- No preambles like "Great question!" or "Sure thing!"',
    '- Be conversational and direct.',
    '- Always focus on practical AI application: show HOW to use AI for things, include example prompts they can try.',
    '- When you give a ready-to-use prompt the learner should paste into their AI tool, put the ENTIRE prompt inside a fenced code block (triple backticks) — never a blockquote and never inline — so it renders with a one-tap copy button.',
    '- When someone is stuck finding something in an app or AI tool ("I don\'t see it"), after one round of text directions suggest they screenshot their screen and paste it into a vision-capable AI (Claude, ChatGPT, and Gemini all accept images) asking where the element is — it reads their actual interface instead of guessing.',
    '- Reference tools they actually use (Slack, Google Docs, spreadsheets) not email unless they ask about email.',
    // The learner works in their OWN AI tool(s), open beside this coach.
    buildToolGuidance(resolveTools(learnerProfile), catalog),
    !isDevTier
      ? '- The learner is NOT a developer. Never suggest Python, terminal commands, or writing code. Focus on prompting practice and workflows they can run in their AI tool.'
      : '- The learner is a developer. You may reference code, APIs, and technical concepts.',
    display_name ? `- The learner's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasksContext,
    goal ? `- Their learning goal: ${goal}` : null,
    '- When relevant, tie advice back to their role, tasks, and goals.',
    '- When teaching about prompting, always reference the RCTF framework: Role (tell the AI who to be), Context (provide background), Task (state what to do), Format (specify output structure). This is the platform\'s core prompting methodology.',
    '- When the learner is trying to LEARN or understand a concept or skill (not just troubleshooting or chit-chat), give them the general idea concisely — enough to be genuinely useful — knowing the app will then offer a deeper, hands-on lesson on the topic. Do NOT ask about taking a lesson in your text; the app surfaces that offer itself.',
    'LESSON SUGGESTION TAG (REQUIRED — MACHINE-READ, NOT SHOWN TO THE LEARNER):',
    '- End EVERY reply with a final line in EXACTLY this form and nothing after it: [[LESSON_TOPIC: <value>]]',
    '- Set <value> to a concise 2–6 word lesson title naming the concept or skill the learner is trying to learn, but ONLY when a short hands-on lesson would genuinely help them. For pure troubleshooting, follow-up tweaks, small talk, or when no clear teachable topic exists, use [[LESSON_TOPIC: NONE]].',
    '- Never mention, explain, or format this tag in your visible answer, and never write anything after it.',
  ].filter(Boolean).join('\n');
}

export async function generateChatReply(messages, learnerProfile) {
  try {
    const catalog = await getMergedTools();
    // The Anthropic API rejects extra keys on message objects. Client-side chat
    // history attaches `lessonTopic` to assistant turns (for the "start a lesson"
    // offer), so strip every message down to {role, content} — otherwise the
    // FIRST follow-up after a lesson-topic reply 400s.
    const cleanMessages = (Array.isArray(messages) ? messages : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 450,
      system: buildChatSystemPrompt(learnerProfile, catalog),
      messages: cleanMessages,
    });

    // The model ends each reply with a machine tag naming a lesson topic (or
    // NONE). Parse it out so chat can offer a lesson, and strip it from the
    // visible reply. This LLM-driven detection is far more reliable than regex.
    let reply = response.content[0].text || '';
    let lessonTopic = null;
    const tag = reply.match(/\[\[LESSON_TOPIC:\s*([^\]]*)\]\]/i);
    if (tag) {
      const raw = (tag[1] || '').trim().replace(/^["']|["']$/g, '').replace(/[?.!,]+$/, '').trim();
      if (raw && !/^none$/i.test(raw) && raw.length >= 3 && raw.split(/\s+/).length <= 8) {
        lessonTopic = raw;
      }
      reply = reply.replace(tag[0], '').trim();
    }

    return { reply, lessonTopic };
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to generate a reply. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// In-app help assistant
// ---------------------------------------------------------------------------

export function buildHelpSystemPrompt() {
  return [
    'You are the in-app help assistant for the "AI Learning Coach" platform by Housecall Pro.',
    'You answer questions about how to USE the platform and help learners who get stuck while taking lessons, playing games, or browsing.',
    '',
    'WHAT THE PLATFORM OFFERS (answer questions about these):',
    '- Lessons (Lesson): pick a topic and a depth — Quick Tip (60s), Quick Lesson (3-5 min), or Deep Dive (15-20 min) — and learn by Reading & practicing or Watching a narrated version. There is also a "Surprise me" button that gives an instant, ready-to-use AI win for your role, and a Project Quest option to build something real. You can leave and Resume a lesson later.',
    '- Just Chat: open-ended Q&A about AI. Asking "what is X / how does X work" offers to launch a lesson on it.',
    '- Modules, Practice, Library, Daily, Discover ("Find AI for your work"), Prompts, Games.',
    '- Progress: XP, Levels, Badges/Achievements, Leaderboard, Knowledge Heatmap, Skill Graph, Goals, Quests, Review, Check-in, Calibrate.',
    '- Profile: edit your name and role; a Reset Profile option (Danger Zone) restarts onboarding.',
    '- The HCP Skill Shop (external, in Docebo) has the AI Self-Guided Journey (Levels 1-3), linked in the sidebar menu.',
    '',
    'STYLE:',
    '- Be brief, friendly, and concrete: 1-4 short sentences, plain language.',
    '- You are a platform guide, not the lesson tutor. Gently redirect anything unrelated.',
    '',
    'WHEN THEY WANT TO LEARN ABOUT A SPECIFIC AI TOPIC (e.g. "what is X", "teach me about prompting", "I want to learn about AI agents"):',
    '- Do NOT teach the topic yourself. Point them to the best place to learn it:',
    '  - Open "Just Chat" and ask there — it answers and can launch a tailored lesson on the topic.',
    '  - Or open the menu (the hamburger / sidebar) and pick "Lesson" to choose a depth (Quick Tip / Quick Lesson / Deep Dive).',
    '- Give a one-line pointer to one of those; keep it encouraging.',
    '',
    'WHEN THEY REPORT A PLATFORM PROBLEM (a bug, something broken, cannot access, or you cannot help):',
    '- Tell them the team can help in Slack, and point them to the HCP Skill Shop Help channel.',
    '- There are two channels — they should use whichever one they have in their Slack:',
    '  - HCP Skill Shop Help: https://housecall.slack.com/archives/C04BU29V4TH',
    '  - HCP MX Skill Shop Help (MX team): https://housecall.slack.com/archives/C04J8BRUJQY',
  ].join('\n');
}

export async function generateHelpReply(messages) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 350,
      system: buildHelpSystemPrompt(),
      messages,
    });
    return response.content[0].text;
  } catch (error) {
    console.error('Help API error:', error);
    throw new Error('Failed to generate a reply. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Discover
// ---------------------------------------------------------------------------

export function buildDiscoverSystemPrompt(learnerProfile, catalog) {
  const { display_name, department, sub_team, tier, goal } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';

  return [
    'You are an AI opportunity finder for a corporate learning platform.',
    'The user will describe their work. Return exactly 4-6 AI opportunities as a JSON array.',
    '',
    'Each object in the array MUST have these fields:',
    '- title (string): short name of the opportunity',
    '- description (string): 1-2 sentence explanation of what to do',
    '- icon (string): a single relevant emoji',
    '- difficulty (string): one of "easy", "medium", or "advanced"',
    '- category (string): one of "writing", "analysis", "meetings", "decisions", "communication", "automation"',
    '- timeSaved (string): estimated time saved, e.g. "15 min/meeting"',
    '- whyItHelps (string): personalized reason tied to what the user described',
    '- starterPrompt (string): an actual prompt they can paste straight into their AI tool. MUST follow the RCTF framework: start with Role ("You are a..."), then Context (background), then Task (what to do), then Format (desired output). Make it complete and ready to use.',
    '',
    'Rules:',
    '- Return ONLY the JSON array. No markdown fences, no explanation.',
    '- Make opportunities specific to the user\'s described work, not generic.',
    '- Order from easiest to hardest.',
    buildToolGuidance(resolveTools(learnerProfile), catalog),
    !isDevTier
      ? '- The user is NOT a developer. Never suggest coding, APIs, or terminal tools. Focus on prompts and workflows they can run in their AI tool.'
      : '- The user is a developer. You may include technical/code-based opportunities.',
    display_name ? `- The user's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

export async function generateDiscoverOpportunities(workDescription, learnerProfile) {
  try {
    const catalog = await getMergedTools();
    const response = await getClient().messages.create({
      model: MODEL,
      // 4-6 opportunities, each with a full RCTF starterPrompt, can run long;
      // 2000 was truncating the JSON array and breaking the parse below.
      max_tokens: 4000,
      system: buildDiscoverSystemPrompt(learnerProfile, catalog),
      messages: [
        { role: 'user', content: `Here is a description of my work:\n\n${workDescription}` },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Parse defensively (mirrors generateDailyPrompts): if the model wraps the
    // array in any prose, fall back to extracting the array span.
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Discover API error:', error);
    throw new Error('Failed to find opportunities. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Suggested topics (personalized to the learner's role)
// ---------------------------------------------------------------------------

export function buildSuggestedTopicsPrompt(learnerProfile, options = {}) {
  const { department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const tasks = Array.isArray(top_tasks) && top_tasks.length ? top_tasks.join(', ') : null;
  const exclude = Array.isArray(options.exclude) ? options.exclude.filter(Boolean).slice(0, 20) : [];

  return [
    'You suggest personalized AI-learning lesson topics for an internal learning platform.',
    'Return EXACTLY 6 lesson topics as a JSON array. Each object has:',
    '- emoji (string): one relevant emoji',
    '- label (string): a short topic name (2-4 words)',
    '- topic (string): a one-sentence description of what the lesson teaches, framed as using AI for the learner\'s actual work',
    '',
    'Rules:',
    '- Return ONLY the JSON array. No markdown fences, no extra text.',
    '- Tailor to the learner\'s role and experience. Vary across writing, analysis, automation, communication, and evaluation.',
    tierLabel === 'developer'
      ? '- The learner is a DEVELOPER. Skip basics like "what is a prompt". Favor advanced, building-oriented topics: AI agents, automating workflows, evaluating model output, retrieval/RAG, prompt engineering for code, and building internal tools.'
      : tierLabel === 'beginner'
        ? '- The learner is a BEGINNER. Favor approachable fundamentals tied to their everyday tasks.'
        : `- The learner's experience level is "${tierLabel}". Match topic difficulty to it (more than beginner, not necessarily developer-level).`,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}. Make the topics relevant to this function.` : null,
    tasks ? `- Their day-to-day tasks: ${tasks}. Tie several topics directly to these.` : null,
    goal ? `- Their stated goal: ${goal}.` : null,
    exclude.length ? `- The learner has ALREADY completed these lessons — do NOT suggest them again. Offer fresh, different topics (you can go deeper or to an adjacent skill): ${exclude.join('; ')}.` : null,
  ].filter(Boolean).join('\n');
}

// A small daily set of ready-to-use prompts tailored to the learner's actual
// job. Cached per day on the client (8 AM PT) so it stays fresh, not stale.
export async function generateDailyPrompts(learnerProfile, options = {}) {
  const { department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tasks = Array.isArray(top_tasks) && top_tasks.length ? top_tasks.join(', ') : null;
  const exclude = Array.isArray(options.exclude) ? options.exclude.filter(Boolean).slice(0, 12) : [];
  const system = [
    'You create ready-to-use AI prompts tailored to one person\'s real job.',
    'Return EXACTLY 4 prompts as a JSON array. Each object has:',
    '- title (string): short, action-oriented name (3-6 words)',
    '- description (string): one sentence on what it helps them do',
    '- category (string): EXACTLY one of: writing, analysis, communication, meetings, planning, creative',
    '- prompt (string): the full, copy-paste-ready prompt. Write it so they can paste it into any AI tool and fill in [bracketed placeholders]. Make it specific and genuinely useful for their work.',
    'Rules:',
    '- Return ONLY the JSON array. No markdown fences, no extra text.',
    '- Tailor every prompt to their role and day-to-day tasks. Vary the categories.',
    '- Keep prompts practical and concrete, never generic filler.',
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasks ? `- Their day-to-day tasks: ${tasks}. Tie the prompts to these.` : null,
    goal ? `- Their goal: ${goal}.` : null,
    tier ? `- Experience level: ${tier}.` : null,
    exclude.length ? `- Offer fresh prompts; avoid repeating these recent ones: ${exclude.join('; ')}.` : null,
  ].filter(Boolean).join('\n');
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1600,
      system,
      messages: [{ role: 'user', content: 'Give me 4 prompts I can use today.' }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch (error) {
    console.error('Daily prompts error:', error);
    throw new Error('Failed to generate daily prompts.');
  }
}

export async function generateSuggestedTopics(learnerProfile, options = {}) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 700,
      system: buildSuggestedTopicsPrompt(learnerProfile, options),
      messages: [{ role: 'user', content: 'Suggest 6 personalized lesson topics for me.' }],
    });
    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch (error) {
    console.error('Suggested topics error:', error);
    throw new Error('Failed to generate suggested topics.');
  }
}

// ---------------------------------------------------------------------------
// Calibration scenarios (role-aware skill placement)
// ---------------------------------------------------------------------------

// The five non-privacy skills the calibration measures. Privacy is kept as a
// hand-written, vetted scenario (compliance-sensitive), so it is NOT generated.
const GENERATED_SKILLS = {
  prompting: 'structuring effective prompts and multi-step AI workflows',
  comms: 'using AI appropriately for customer/stakeholder communication',
  eval: 'verifying AI output — catching hallucinations and checking accuracy',
  agents: 'automating multi-step work and knowing when to trust agentic tools',
  data: 'working with data and reports, and validating AI-generated numbers',
};
const VALID_SKILL_KEYS = ['privacy', 'prompting', 'comms', 'eval', 'agents', 'data'];

function buildCalibrationScenariosPrompt(learnerProfile) {
  const { department, sub_team, tier, goal, top_tasks, title } = learnerProfile || {};
  const tasks = Array.isArray(top_tasks) && top_tasks.length ? top_tasks.join(', ') : null;
  const skillLines = Object.entries(GENERATED_SKILLS).map(([k, v]) => `  - ${k}: ${v}`).join('\n');
  return [
    'You write skill-placement scenarios for an internal AI-learning platform.',
    'They gauge how someone ACTUALLY works with AI (not what they claim), so their lessons are pitched at the right level.',
    '',
    'Return EXACTLY 5 scenarios as a JSON array — one per skill, in this order: prompting, comms, eval, agents, data.',
    'Each scenario object has:',
    '- id (string): the skill key (prompting | comms | eval | agents | data), each used exactly once',
    '- primary (string): same as id',
    '- setup (string): 2-4 sentences describing a realistic situation FROM THIS PERSON\'S OWN WORK',
    '- prompt (string): the question to the learner (e.g. "What\'s the best approach?")',
    '- answers (array): EXACTLY 4 objects, each { "text": string, "scores": { <skillKey>: number } }',
    '',
    'What each skill measures:',
    skillLines,
    '',
    'Scoring rubric (critical — keep it consistent):',
    '- Every answer MUST score its scenario\'s primary skill. Use a graduated spread across the 4 options: one naive/wrong (~0.1-0.2), one partial (~0.35-0.5), one solid (~0.6-0.8), one best-practice (~0.9-1.0).',
    `- scores keys must be from: ${VALID_SKILL_KEYS.join(', ')}. Values are numbers 0.0-1.0.`,
    '- An answer may add a small secondary score (0.2-0.5) on another skill when relevant.',
    '- VARY which position holds the best answer across the 5 scenarios (don\'t always put it last).',
    '',
    'Rules:',
    '- Return ONLY the JSON array. No markdown fences, no prose.',
    '- Ground every scenario in the person\'s real role and tasks below — concrete, specific, and plausible for their day.',
    tier ? `- Pitch difficulty to their experience level: ${tier}. Don\'t make it trivially easy for advanced folks or overwhelming for beginners.` : null,
    title ? `- Their title: ${title}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasks ? `- Their day-to-day tasks: ${tasks}. Anchor the scenarios in these.` : null,
    goal ? `- Their stated goal: ${goal}.` : null,
  ].filter(Boolean).join('\n');
}

// Validate one generated scenario against the schema so a malformed item can't
// corrupt scoring. Returns a cleaned scenario for `skillKey`, or null to reject.
function cleanScenario(raw, skillKey) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.setup !== 'string' || typeof raw.prompt !== 'string') return null;
  if (!Array.isArray(raw.answers) || raw.answers.length !== 4) return null;
  const answers = [];
  for (const a of raw.answers) {
    if (!a || typeof a.text !== 'string' || !a.scores || typeof a.scores !== 'object') return null;
    const scores = {};
    for (const [k, v] of Object.entries(a.scores)) {
      if (VALID_SKILL_KEYS.includes(k) && typeof v === 'number' && isFinite(v)) {
        scores[k] = Math.max(0, Math.min(1, v));
      }
    }
    // The primary skill must be scored, or this option can't calibrate it.
    if (scores[skillKey] === undefined) return null;
    answers.push({ text: a.text, scores });
  }
  return { id: skillKey, primary: skillKey, setup: raw.setup, prompt: raw.prompt, answers };
}

// Generate role-tailored scenarios for the five non-privacy skills. Returns a
// map { [skillKey]: scenario } containing only the ones that generated cleanly —
// the caller fills any gaps from the curated fallback set. Never throws.
export async function generateCalibrationScenarios(learnerProfile) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: buildCalibrationScenariosPrompt(learnerProfile),
      messages: [{ role: 'user', content: 'Generate my 5 calibration scenarios.' }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    }
    if (!Array.isArray(parsed)) return {};
    const byKey = {};
    for (const item of parsed) {
      const key = typeof item?.id === 'string' ? item.id : item?.primary;
      if (!GENERATED_SKILLS[key] || byKey[key]) continue; // unknown/privacy/duplicate
      const cleaned = cleanScenario(item, key);
      if (cleaned) byKey[key] = cleaned;
    }
    return byKey;
  } catch (error) {
    console.error('Calibration scenarios error:', error);
    return {};
  }
}

// ---------------------------------------------------------------------------
// AI tool catalog — suggested "what it's good for" refresh (admin-reviewed)
// ---------------------------------------------------------------------------

// Propose a refreshed one-line "best for" for each tool in the catalog. The
// admin reviews and approves before anything is saved, so this is a draft, not
// a source of truth. (The model's knowledge has a cutoff — treat suggestions as
// a starting point and sanity-check them.)
export async function generateToolStrengthSuggestions(tools) {
  const list = (Array.isArray(tools) ? tools : [])
    .map((t) => `- id: ${t.id} | name: ${t.label} | current: ${t.strengths || '(none)'}`)
    .join('\n');

  const system = [
    'You maintain the "what each AI tool is good for" catalog for an internal learning platform.',
    'For each tool below, write a single concise phrase describing what it is BEST suited for today, relative to the other tools — the kind of tasks where it is the strongest choice.',
    'Keep each phrase short (a clause, not a sentence), lowercase, no trailing period, in the same style as the current values.',
    'Only change a value if the tool\'s real-world strengths have meaningfully shifted; otherwise return the current phrasing.',
    '',
    'Return ONLY a JSON array (no markdown fences, no extra text). Each object:',
    '- id (string): the tool id, exactly as given',
    '- strengths (string): the suggested phrase',
    '- changed (boolean): true if this differs from the current value',
    '- reason (string): one short line on why it changed, or "" if unchanged',
  ].join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: `Tools:\n${list}` }],
    });
    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Tool strength suggestion error:', error);
    throw new Error('Failed to generate suggestions. Please try again.');
  }
}

// Describe a tool the learner typed in (a custom "other" tool): a short "best
// for" phrase and the official URL. Used to auto-fill custom tools.
export async function generateToolDescription(name) {
  const system = [
    'You help an internal learning platform describe AI tools learners add themselves.',
    'Given the name of an AI tool/assistant, return what it is best suited for and its primary URL.',
    '',
    'Return ONLY a JSON object (no markdown fences):',
    '- strengths (string): a short lowercase phrase of what it is best for (a clause, no trailing period), same style as "general writing, brainstorming, and everyday tasks". If you do not recognize the tool, return "".',
    '- url (string): the official primary URL (e.g. "https://perplexity.ai/"). If unknown, return "".',
    '- emoji (string): a single emoji that best represents this tool (e.g. a magnifying glass for a search tool, a phone for a voice tool). If unsure, return "✨".',
  ].join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 250,
      system,
      messages: [{ role: 'user', content: `Tool name: ${name}` }],
    });
    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    return {
      strengths: typeof parsed.strengths === 'string' ? parsed.strengths.trim() : '',
      url: typeof parsed.url === 'string' ? parsed.url.trim() : '',
      emoji: typeof parsed.emoji === 'string' && parsed.emoji.trim() ? parsed.emoji.trim() : '',
    };
  } catch (error) {
    console.error('Tool description error:', error);
    return { strengths: '', url: '', emoji: '' };
  }
}

// Recommend the single best AI tool for a given lesson topic, from the catalog,
// with a one-line why. Independent of lesson generation so it can't affect the
// lesson JSON. Returns { tool, why } (label string + reason) or null on failure.
export async function generateToolRecommendation(topic, options = {}) {
  try {
    const catalog = await getMergedTools();
    if (!catalog?.length) return null;

    // If the learner explicitly asked to use a specific tool (e.g. they said so
    // in the refine chat), honor it instead of second-guessing them — match it
    // to the catalog and recommend THAT, so the recommendation never contradicts
    // what they just told us. Match on label, id, or a loose contains (so
    // "github" resolves to "GitHub Copilot").
    const preferred = (options.preferredTool || '').trim();
    if (preferred) {
      const p = preferred.toLowerCase();
      const hit = catalog.find(
        (t) =>
          t.label?.toLowerCase() === p ||
          t.id?.toLowerCase() === p ||
          t.label?.toLowerCase().includes(p) ||
          p.includes(t.label?.toLowerCase()),
      );
      if (hit) return { tool: hit.label, why: `You asked to use ${hit.label} for this lesson.` };
      // Not in the catalog but they named it — still respect the choice.
      return { tool: preferred, why: `You asked to use ${preferred} for this lesson.` };
    }

    const list = catalog
      .map((t) => `- ${t.label}${t.strengths ? `: best for ${t.strengths}` : ''}`)
      .join('\n');
    const system = [
      'You recommend the single best AI tool for a given lesson topic.',
      'Choose exactly ONE tool from this list — the one genuinely best suited to the topic:',
      list,
      'IMPORTANT RULE for coding/automation topics — anything involving code, scripts, APIs, n8n, workflows/automation, debugging, or developer tools: recommend Claude or GitHub Copilot (prefer GitHub Copilot when it is clearly hands-on coding in an editor/GitHub, otherwise Claude). NEVER recommend ChatGPT for these coding/automation topics.',
      'Return ONLY JSON: {"tool": "<exact tool label from the list>", "why": "<one short, plain sentence on why it fits THIS topic>"}.',
    ].join('\n');

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 200,
      system,
      messages: [{ role: 'user', content: `Lesson topic: "${topic}". Which tool is best and why?` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    const tool = String(parsed.tool || '').trim();
    const why = String(parsed.why || '').trim();
    if (!tool) return null;
    return { tool, why };
  } catch (error) {
    console.error('Tool recommendation error:', error);
    return null;
  }
}

// A short, plain description of who the learner is, so clarifying questions and
// suggested angles land on their actual role and work.
function learnerContextLine(learnerProfile) {
  const { department, sub_team, top_tasks } = learnerProfile || {};
  const bits = [];
  if (department) bits.push(`works in ${department}${sub_team ? ` (${sub_team})` : ''}`);
  if (Array.isArray(top_tasks) && top_tasks.length) bits.push(`day-to-day tasks: ${top_tasks.slice(0, 5).join(', ')}`);
  return bits.length ? `The learner ${bits.join('; ')}.` : '';
}

// What "specific enough to teach" actually means — shared by the clarify gate
// and the refinement chat so they hold the same (deliberately high) bar.
const TOPIC_SPECIFICITY_RUBRIC = [
  'A topic is SPECIFIC enough ONLY if it names a concrete task, problem, or outcome — what the learner will actually DO, with what, toward what result.',
  'A topic is STILL VAGUE if it is just a tool, a category, or a broad qualifier with no concrete task. Qualifiers like "multi-step", "advanced", "intro to", "the basics of", "common", or "how to use" do NOT make a topic specific — they just describe a category.',
  'STILL VAGUE examples: "n8n workflows", "multi-step workflows", "advanced prompting", "using AI", "spreadsheets", "automation", "AI for marketing", "data analysis".',
  'SPECIFIC examples: "Building an n8n workflow that posts new form submissions to Slack", "Troubleshooting Slack node authentication in n8n", "Writing a weekly status update from meeting notes with AI", "Using AI to clean and dedupe a customer spreadsheet".',
].join('\n');

// Decide whether a typed topic is too vague to teach well, and if so produce a
// short clarifying question plus pickable directions: a "just the basics" option
// and 1-2 specific angles tailored to the learner. Specific topics return
// { vague: false } so the lesson starts immediately. `options.context` is a
// broader topic this input is narrowing (so refinements keep their domain/tool
// instead of dropping it). Best-effort — on any error it returns
// { vague: false } so a hiccup never blocks starting a lesson.
export async function generateTopicClarification(topic, learnerProfile, options = {}) {
  try {
    const ctx = learnerContextLine(learnerProfile);
    const context = (options.context || '').trim();
    const system = [
      'You triage a learner-typed lesson topic on an internal AI-skills platform.',
      'Decide if the topic is SPECIFIC enough to teach a focused, useful lesson, or so BROAD/VAGUE that the lesson would be generic.',
      TOPIC_SPECIFICITY_RUBRIC,
      context
        ? `IMPORTANT: the learner is narrowing a broader topic: "${context}". Interpret their input as a refinement of THAT, and ALWAYS keep that domain/tool in any "topic" you produce (e.g. don't drop "n8n"). If the combined intent is still just a category, it is STILL VAGUE — keep narrowing.`
        : null,
      ctx,
      'If SPECIFIC, return {"vague": false}.',
      'If VAGUE, return {"vague": true, "question": "<one short friendly question that pushes toward a concrete task/problem/outcome>", "basics": {"label": "Just the basics", "topic": "<the topic, framed as a beginner overview, keeping any domain/tool>"}, "angles": [{"label": "<short specific direction, max ~6 words>", "topic": "<a sharper, lesson-ready version naming a concrete task>"}]}.',
      'Provide 1-2 angles, each a concrete, specific sub-topic the learner most likely wants — grounded in their role/tasks when relevant. The "topic" fields become the actual lesson topic, so make them clear, self-contained, and concrete (a real task, not another category).',
      'Return ONLY the JSON object, nothing else.',
    ].filter(Boolean).join('\n');

    const userContent = context ? `Broader topic: "${context}"\nLearner's refinement: "${topic}"` : `Topic: "${topic}"`;
    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    if (!parsed?.vague) return { vague: false };
    const angles = Array.isArray(parsed.angles)
      ? parsed.angles
          .filter((a) => a && a.label && a.topic)
          .slice(0, 2)
          .map((a) => ({ label: String(a.label).trim(), topic: String(a.topic).trim() }))
      : [];
    const basics = parsed.basics?.topic
      ? { label: String(parsed.basics.label || 'Just the basics').trim(), topic: String(parsed.basics.topic).trim() }
      : { label: 'Just the basics', topic };
    // Without at least one specific angle there's nothing useful to ask — let the
    // lesson start on the original topic rather than show an empty prompt.
    if (!angles.length) return { vague: false };
    return {
      vague: true,
      question: String(parsed.question || 'What would help most?').trim(),
      basics,
      angles,
    };
  } catch (error) {
    console.error('Topic clarification error:', error);
    return { vague: false };
  }
}

// Drive the "this isn't what I was looking for" refinement chat. Given the
// original topic and the back-and-forth so far, either ask ONE more focused
// question or, once there's enough to go on, return a sharpened newTopic to
// rebuild the lesson around. Returns { done, message, newTopic }.
export async function generateTopicRefinement(topic, messages, learnerProfile) {
  try {
    const ctx = learnerContextLine(learnerProfile);
    const answersGiven = (messages || []).filter((m) => m.role === 'user').length;
    const system = [
      'You are helping a learner who just got an AI lesson that "wasn\'t what they were looking for."',
      `The lesson was about: "${topic}".`,
      ctx,
      'Your job: figure out what they actually want, then hand back a sharper, CONCRETE lesson topic.',
      TOPIC_SPECIFICITY_RUBRIC,
      'Ask ONE short, focused question at a time to narrow it down. Keep questions friendly and concrete, and push toward a real task/problem/outcome (what are they trying to produce? what is going wrong?).',
      'CRITICAL — TOOL vs TOPIC: the lesson TOPIC is the task or subject the learner wants to learn. The TOOL (ChatGPT, Claude, Gemini, Microsoft Copilot, GitHub Copilot, etc.) is just which AI app they do it in. NEVER put an AI tool name into newTopic, and NEVER turn "I\'d rather use <tool>" into a topic change. Wanting a different tool is NOT a reason to rewrite the topic — keep the same subject.',
      'If the learner names an AI tool they want to use for this lesson, capture it in the "tool" field (verbatim, e.g. "GitHub Copilot") and keep newTopic about the original task. If they have not named a tool, omit "tool".',
      'Do NOT return done:true while the topic is still just a category or qualifier (e.g. "multi-step workflows") — keep asking until it names something concrete.',
      answersGiven >= 3
        ? 'You have asked enough — return done:true now with the most concrete newTopic you can infer from what they\'ve said.'
        : 'Only return done:true once you can name a clear, SPECIFIC, concrete lesson topic that fits what they want. If their only ask was to use a different tool, return done:true with newTopic equal to the SAME task and the "tool" field set.',
      'When still gathering, return {"done": false, "message": "<your next question>", "tool": "<tool they named, if any>"}.',
      'When ready, return {"done": true, "message": "<one-line confirmation of what the new lesson will cover>", "newTopic": "<the sharpened, self-contained, concrete lesson topic — NO tool name in it>", "tool": "<tool they named, if any>"}.',
      'Return ONLY the JSON object.',
    ].filter(Boolean).join('\n');

    const convo = (messages || [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }));

    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 400,
      system,
      messages: convo.length ? convo : [{ role: 'user', content: 'This isn\'t what I was looking for.' }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // Parse defensively — Haiku occasionally wraps the object in a stray word or
    // newline, which a bare JSON.parse would choke on, silently dropping the
    // learner into the "tell me more" fallback on every turn.
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const done = !!parsed.done && !!parsed.newTopic;
    const tool = parsed.tool ? String(parsed.tool).trim() : null;
    return {
      done,
      message: String(parsed.message || (done ? 'Here\'s a better-fitting lesson.' : 'Can you tell me a bit more about what you were hoping to learn?')).trim(),
      newTopic: done ? String(parsed.newTopic).trim() : null,
      tool: tool || null,
    };
  } catch (error) {
    console.error('Topic refinement error:', error);
    return { done: false, message: 'Can you tell me a bit more about what you were hoping to learn?', newTopic: null, tool: null };
  }
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

// quick_tip needs headroom despite being the shortest format: its single slide
// is a complete-phase response, which carries the full recap object.
const FORMAT_TOKENS = {
  quick_tip: 800,
  standard: 1000,
  deep_dive: 1500,
};

export function buildLessonSystemPrompt(topic, learnerProfile, options = {}) {
  const { display_name, department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';
  const format = options.format || 'standard';
  const tools = resolveTools(learnerProfile);
  const primaryTool = tools[0];

  const formatGuide = {
    quick_tip: [
      'This is a Quick Tip (60 seconds) — make it genuinely useful, not generic. It should feel as helpful as a great 60-second coaching moment.',
      'The opening slide is phase "intro" and MUST contain, in this order:',
      '  1. The single most useful, SPECIFIC insight for this topic — one concrete idea they can act on today, tied to their actual work (not a vague definition).',
      `  2. ONE ready-to-use AI prompt they can copy and paste into their AI tool (${primaryTool.label}) right now, shown in a fenced code block, with a one-line note on what it does.`,
      '  3. A single "Try this:" line telling them exactly what to do next with that prompt.',
      'Keep the whole thing tight — a 60-second read. Lead with the insight, not preamble.',
      'Include exactly ONE button: { label: "Got it", action: "complete" }. Do NOT add a "Try it yourself" or any practice button — the learner starts practice from the chat box.',
      'Do NOT use the complete phase on the opening slide — the learner must read the tip first.',
      'If the learner asks to try a scenario or types an attempt, switch to phase "practice" (see INTERACTIVE PRACTICE below). Keep only the { label: "Got it", action: "complete" } button so they can finish whenever they want.',
    ].join('\n'),
    standard: 'This is a Quick Lesson (3-5 minutes), 4-5 slides MAXIMUM. Advance exactly ONE phase per Continue click in this order: intro -> concepts -> steps -> practice -> complete. Never repeat a phase. By your 4th response you MUST be at phase "practice" — invite them to practice from the chat box, do NOT keep emitting more steps. When they finish practicing or ask to move on, go to "complete".',
    deep_dive: 'This is a Deep Dive (15-20 minutes). Be thorough but ALWAYS move forward: advance exactly ONE phase per Continue click through intro -> concepts -> setup -> steps -> verify -> practice -> evaluate -> apply -> complete, never repeating a phase. Reach phase "practice" within the first few slides and invite chat-based practice there; offer more personalized practice again at the "apply" phase.',
  };

  const tasksContext = Array.isArray(top_tasks) && top_tasks.length > 0
    ? `- Their day-to-day tasks: ${top_tasks.join(', ')}. Use these as the context for examples and exercises.`
    : null;

  // Per-tier guidance. Beginners get HARD constraints so a technical topic
  // (e.g. RAG, embeddings, APIs) is reframed around everyday use rather than
  // shown as code/SQL. Higher tiers progressively allow more depth.
  const tierGuidance = {
    beginner: [
      '- LEARNER LEVEL: BEGINNER — brand new to AI. Treat the following as HARD RULES that OVERRIDE everything else, not suggestions:',
      '  • NEVER include code, SQL, terminal commands, config, or API/technical syntax — not even in examples. If you are about to write a code block, STOP and replace it with a plain-English explanation or analogy.',
      `  • Even though the topic "${topic}" may sound technical, do NOT teach how to implement it. Reframe it entirely around what it means in plain English, when it would help them in their everyday work, and a simple real-world analogy. A beginner should finish understanding the IDEA, never having seen a line of code.`,
      '  • NEVER use unexplained jargon. Define any necessary term in plain words.',
      '  • Keep it simple, concrete, and encouraging. Assume zero technical background.',
      '  • All practice happens in plain English in their AI tool — hand them prompts to paste in and coach them through the results.',
    ].join('\n'),
    practitioner: '- LEARNER LEVEL: PRACTITIONER — has used AI a few times. Avoid code and heavy jargon. Focus on practical, plain-language prompting applied to their everyday tasks.',
    power_user: '- LEARNER LEVEL: POWER USER — uses AI regularly. Skip the absolute basics. Go deeper on advanced prompting, workflows, and getting better results. Avoid code unless it is genuinely simple and fully explained.',
    builder: '- LEARNER LEVEL: BUILDER — builds workflows and automations (not necessarily a coder). Favor automation concepts, connecting tools, and structuring workflows. Light technical detail is fine; keep heavy programming minimal and clearly explained.',
    developer: '- LEARNER LEVEL: DEVELOPER — writes code with AI. You may include code examples, technical details, and implementation specifics.',
  };
  const tierBlock = tierGuidance[tierLabel] || tierGuidance.beginner;

  return [
    `You are a hands-on AI tutor teaching a lesson on: "${topic}".`,
    'You teach by SHOWING HOW TO USE AI, not just explaining the topic itself.',
    '',
    'LEARNER LEVEL — READ THIS FIRST, IT SHAPES EVERYTHING BELOW:',
    tierBlock,
    '',
    'AI APPLICATION FOCUS (CRITICAL):',
    '- Every lesson MUST teach how to use AI for the topic. Do not just explain the task — show how AI makes it better, faster, or easier.',
    '- Include specific AI prompts the learner can copy and paste into their AI tool. Show the prompt, explain what it does, and show the expected output.',
    '- Frame everything around "here is how you use AI for this" not "here is how to do this manually."',
    '- Reference tools the learner actually uses (Slack, Google Docs, spreadsheets) not email unless the topic is specifically about email.',
    buildToolGuidance(tools, options.catalog),
    '- When referring to the technology in general (not a specific product), write "a large language model (LLM)" — spell out the acronym the first time so beginners understand it.',
    '',
    'GUIDED, CHATBOT-STYLE TEACHING (act like a coach walking beside them):',
    '- LESSON STRUCTURE — follow this arc, one slide per phase, before any hands-on steps:',
    '  • intro (phase "intro"): open with WHAT this is AND WHY it matters for their actual work, together. Keep it tight — combine what + why concisely, do not pad with extra language.',
    '  • concepts (phase "concepts"): the core ideas they need to understand the topic ("the content") — in plain language, with a diagram or table. Keep it focused (2-4 key concepts), not a textbook.',
    '  • then move into the hands-on steps and practice described below.',
    `- BE IN THE SOFTWARE: tell the learner up front to open their AI tool (${primaryTool.label}) in a separate window and follow along live. If the lesson also involves another non-AI tool (e.g. n8n, a spreadsheet, Slack), have them open that too. They do the actual AI work in their tool as you coach them.`,
    '- STEP FRAMING: when teaching a multi-step process, say how many steps there are up front ("There are 3 steps…"), then guide ONE step at a time and acknowledge progress before the next ("Now that you\'ve generated your workflow, let\'s connect it…").',
    '- QUICK CHECKS: after a key concept or step, ask ONE short check-in question and invite them to answer in the chat before moving on (e.g. "Quick check: what would you change about that prompt?"). Keep it light, not a quiz.',
    '- PLAIN-LANGUAGE JARGON: the first time you use a technical term, define it in plain language in parentheses — e.g. "generate a JSON (a structured text file the tool can import)". Assume a non-technical learner unless told otherwise.',
    '- SHOW ME HOW: when a step requires doing something, offer a detailed walkthrough if they want it — if the learner says "show me how", break that one step into precise, click-by-click sub-steps.',
    '',
    'BREVITY & VISUAL STRUCTURE RULES:',
    '- Lead with a VISUAL, not walls of text. Keep the message to 2-4 short sentences and let a diagram or table carry the explanation.',
    '- Use **bold**, bullets, and `code` for structure.',
    '- VISUALS — include a diagram or table on most teaching slides (at least one per lesson). Use them for processes, comparisons, and relationships:',
    '  • Diagrams: put Mermaid syntax inside a ```mermaid fenced code block. Prefer a simple "flowchart LR" or "flowchart TD" with 3-6 nodes. Example:\n```mermaid\nflowchart LR\n  A[Your draft] --> B[AI ethics check] --> C[Revised prompt]\n```',
    '  • Keep Mermaid node labels short and plain — letters, spaces, and numbers only. Do NOT use quotes, parentheses, colons, or HTML inside labels, or the diagram will fail to render.',
    '  • Tables: use a markdown pipe table (| Col | Col | with a |---|---| separator row) for before/after or option comparisons.',
    '- One concept per slide. Write like you are texting a coworker, not writing a textbook.',
    '- When you number a list of steps, number them sequentially (1, 2, 3, …) — never restart at 1 for each step, even if other content sits between them.',
    '',
    formatGuide[format] || formatGuide.standard,
    '',
    'INTERACTIVE PRACTICE (all formats — this is how practice works):',
    '- Practice is driven from the chat box, NOT buttons. NEVER create a "Try it yourself" or "Try another scenario" button.',
    '- For multi-step lessons (Quick Lesson / Deep Dive), when you FIRST reach a practice point (phase "practice" or "apply"), make that slide briefly INVITE the learner to practice — set up what they will practice in a sentence — rather than dumping the full scenario into the slide. The chat box below is ALREADY prefilled with their request, so say something like "Ready to try? Press enter (or tap the arrow) below and I\'ll give you a real scenario from your work." Do NOT tell them to type a specific phrase. Deliver the concrete scenario in your reply after they send it.',
    '- When the learner asks to try a scenario (e.g. "I\'d like to try a scenario"), present ONE short, concrete scenario built around their ACTUAL role and one of their top tasks (see the task/department context below) — never a generic example. Invite them to type their attempt right in the chat.',
    '- When the learner types an attempt: give brief, specific, encouraging feedback (what worked + one thing to improve). Then, in your message text, invite them to try another scenario (use a DIFFERENT top task next time) or move on.',
    '- When you deliver a concrete scenario for the learner to ATTEMPT, do NOT include a "next" button — wait for their typed attempt. Only after they attempt (or say they want to move on) include a { label: "Continue", action: "next" } button.',
    '',
    'BUTTONS & NAVIGATION (IMPORTANT):',
    '- Your "buttons" are shown to the learner as tappable suggestion chips below the slide (they can also type their own message). Make them concrete so the learner always knows what they can do next.',
    '- On a normal teaching slide, offer 2-3 buttons that guide them forward: ALWAYS include one { label: "Continue", action: "next" } to advance, PLUS 1-2 engaging, specific options relevant to THIS slide — e.g. { label: "Show me a real example", action: "show_example" }, { label: "Quiz me on this", action: "next" }, or a tailored reflection like { label: "How would I use this in my work?", action: "next" }. Keep labels short and action-oriented.',
    '- Treat any message where the learner asks to continue / move on / "next" as a signal to advance to the next phase.',
    '- If the learner says they are done, want to wrap up, or finish, return phase "complete" with the recap.',
    '',
    'Return your response as a single JSON object with these fields:',
    '- slideTitle (string): short title for this slide',
    '- message (string): your teaching content, using **bold**, bullets, `code` formatting, and simple ASCII diagrams/tables where helpful',
    '- keyPoints (array of strings): 2-4 key takeaways. Use SPARINGLY — only on the intro slide and at a natural summary moment. Leave it empty ([]) on most slides so the same takeaways are not repeated slide after slide.',
    '- phase (string): one of "intro", "concepts", "setup", "steps", "verify", "practice", "evaluate", "apply", "complete"',
    '- buttons (array of objects): each has { label (string), action (string) }. action is one of: "next", "try_exercise", "show_example", "complete"',
    '',
    'When phase is "complete", also include:',
    '- recap (object): { topic (string), keyPoints (array of strings), applyTip (string) }',
    '',
    'Rules:',
    '- Return ONLY the JSON object. No markdown fences, no explanation outside the JSON.',
    '- Progress through phases logically based on conversation history.',
    '- When the learner clicks a "next"/Continue button, ALWAYS advance to the next phase in the defined order. Never emit the same phase twice in a row and never go backwards — count how many phases you have already shown in the conversation and move to the one after it.',
    '- If the user attempts an exercise, evaluate their attempt and give feedback.',
    isDevTier ? null : `- REMINDER: the learner level above is binding. No code or jargon — reframe technical topics in plain English. Practice happens in their AI tool (${primaryTool.label}), with prompts you hand them to paste in.`,
    display_name ? `- The learner's name is ${display_name}.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}.` : null,
    tasksContext,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

export async function generateLessonResponse(topic, messages, learnerProfile, options = {}) {
  const format = options.format || 'standard';
  const maxTokens = FORMAT_TOKENS[format] || FORMAT_TOKENS.standard;

  try {
    const catalog = await getMergedTools();
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: buildLessonSystemPrompt(topic, learnerProfile, { ...options, catalog }),
      messages,
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  } catch (error) {
    console.error('Lesson API error:', error);
    throw new Error('Failed to generate lesson content. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// End-of-lesson quiz (checkpoint questions that gate XP)
// ---------------------------------------------------------------------------

// How many checkpoint questions each format gets. quick_tip has none — quick
// tips are completion-only and never quizzed.
const QUIZ_COUNT = {
  standard: 3,
  deep_dive: 5,
};

// Generate multiple-choice checkpoint questions grounded in what the lesson
// actually taught. Returns { questions: [{ question, options[4], correctIndex,
// explanation }] }. `transcript` is the lesson's assistant slides so questions
// test the real content, not generic trivia.
export async function generateLessonQuiz(topic, transcript, learnerProfile, options = {}) {
  const format = options.format || 'standard';
  const count = QUIZ_COUNT[format] || QUIZ_COUNT.standard;
  const { tier } = learnerProfile || {};
  const isDevTier = tier === 'developer';

  const system = [
    `You write a short multiple-choice quiz to check understanding of a lesson on: "${topic}".`,
    `Produce exactly ${count} questions.`,
    'Each question tests a key, practical takeaway the lesson actually taught — how to USE AI for this topic. No trick questions, no trivia about wording.',
    'Each question has exactly 4 options. Exactly ONE is correct. The wrong options must be plausible but clearly wrong to someone who understood the lesson.',
    isDevTier ? null : 'The learner is not a developer — keep language plain, no code or jargon.',
    'Keep questions and options concise (one sentence each).',
    'Return ONLY a JSON object (no markdown fences, no text outside it) with:',
    '- questions (array): each is { question (string), options (array of exactly 4 strings), correctIndex (integer 0-3), explanation (string, one sentence on why the answer is right) }.',
  ].filter(Boolean).join('\n');

  const transcriptText = (transcript || '').slice(0, 6000);

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1400,
      system,
      messages: [
        { role: 'user', content: `Here is the lesson content the learner just went through:\n\n${transcriptText}\n\nWrite the quiz now.` },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);

    // Validate/normalize so the client can trust the shape.
    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .filter(q => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .map(q => ({
        question: q.question,
        options: q.options.map(String),
        correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex) || 0)),
        explanation: typeof q.explanation === 'string' ? q.explanation : '',
      }));

    if (!questions.length) throw new Error('No valid quiz questions generated');
    return { questions };
  } catch (error) {
    console.error('Quiz generation error:', error);
    throw new Error('Failed to generate the lesson quiz. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Lesson PLAN (Bloom-based, planned upfront)
// ---------------------------------------------------------------------------

// How many objectives + activities each format targets. The plan is generated
// once at the start and is the source of truth: the teaching content and the
// activities both map back to the objectives.
const PLAN_SHAPE = {
  standard: { objectives: 1, label: 'Quick Lesson (3-5 min)', steps: '3-4' },
  deep_dive: { objectives: 3, label: 'Deep Dive (15-20 min)', steps: '7-10' },
  project_quest: { objectives: 4, label: 'Project Quest (20-60 min)', steps: '9-12' },
};

// Hard upper bound on total steps (including the recap), enforced after
// generation so a lesson can never overshoot its promised time (e.g. a Deep
// Dive showing "Step 1 of 11"). The model is also told the cap in the prompt.
const PLAN_MAX_STEPS = { standard: 5, deep_dive: 10, project_quest: 12 };

const PLAN_TOKENS = { standard: 3000, deep_dive: 7000, project_quest: 8000 };

// Trim a plan to its step cap without orphaning objectives: never drop activity
// steps (they prove objectives) or the recap — shed extra TEACH steps from the
// end first (keeping the opening intro). Falls back to a hard slice only if a
// plan is somehow all-activities over budget.
function clampPlanSteps(steps, maxSteps) {
  if (!Array.isArray(steps) || steps.length <= maxSteps) return steps;
  const recap = steps.find((s) => s.kind === 'recap');
  const body = steps.filter((s) => s !== recap);
  const budget = maxSteps - (recap ? 1 : 0);
  if (body.length > budget) {
    // Indexes of teach steps we may drop (keep the first step as the intro).
    const droppable = body.map((s, i) => ({ s, i })).filter(({ s }, i) => s.kind === 'teach' && i !== 0);
    let toRemove = body.length - budget;
    const removeSet = new Set();
    for (let k = droppable.length - 1; k >= 0 && toRemove > 0; k--) { removeSet.add(droppable[k].i); toRemove--; }
    let trimmed = body.filter((_, i) => !removeSet.has(i));
    if (trimmed.length > budget) trimmed = trimmed.slice(0, budget); // last resort
    return recap ? [...trimmed, recap] : trimmed;
  }
  return recap ? [...body, recap] : body;
}

// Generate a full lesson plan: measurable Bloom-framed learning objectives plus
// an ordered list of steps (teach + interactive activity). Every objective is
// backed by at least one activity the learner must pass to prove mastery.
// Activity specs are fully self-contained so the client can play + grade them.
// Specific, often-recent AI products/features the base model is likely to know
// only partially (or not at all) and tends to "round off" to the parent brand
// or generic basics. When a topic names one of these we ground the lesson in a
// live web lookup instead of the model's stale prior. General skills (e.g.
// "writing good prompts") never match, so they generate as fast as before.
// Extend this list as new tools come up.
const NICHE_TOOL_TOKENS = [
  'cowork', 'copilot', 'cursor', 'windsurf', 'operator', 'sora', 'firefly',
  'runway', 'perplexity', 'midjourney', 'grok', 'notebooklm', 'dall-e', 'dalle',
  'artifacts', 'projects', 'agent builder', 'agentforce', 'gemini gems', 'gpts',
  'custom gpt', 'devin', 'replit agent', 'v0',
];

function looksLikeSpecificTool(topic) {
  const t = (topic || '').toLowerCase();
  return NICHE_TOOL_TOKENS.some((k) => t.includes(k));
}

// Anthropic server-side web search tool spec (executed by the API in-request).
const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 3 };

// Concatenate the text blocks of a response (a web-search response can also
// contain tool-use / search-result blocks, so we can't assume content[0]).
function responseText(response) {
  return (response.content || [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
}

export async function generateLessonPlan(topic, learnerProfile, options = {}) {
  const format = options.format === 'deep_dive' || options.format === 'project_quest'
    ? options.format : 'standard';
  const shape = PLAN_SHAPE[format];
  const { tier, department, top_tasks } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(learnerProfile);
  const catalog = options.catalog || (await getMergedTools());

  const isQuest = format === 'project_quest';
  const system = [
    isQuest
      ? `You design a hands-on AI PROJECT QUEST on: "${topic}" — a ${shape.label}. This is NOT a quick lesson: the learner BUILDS something real and usable end to end (e.g. a reusable prompt, a working automation, a set of templates) and walks away with that artifact. Each step should move the build forward toward a finished deliverable.`
      : `You design a hands-on AI micro-lesson on: "${topic}" — a ${shape.label}.`,
    '',
    'LEARNING OBJECTIVES ARE THE SOURCE OF TRUTH. Write them first, then build everything to serve them.',
    `Write exactly ${shape.objectives} objectives. Each MUST:`,
    '- SHORT and learner-friendly: aim for 6-10 words, max 12. One clear thing they can do.',
    '- Plain, everyday language. NO big or corporate words (no leverage, utilize, orchestrate, facilitate, synthesize, optimize, methodology). Write like you\'d say it to a coworker.',
    '- Start with a simple action verb the learner can prove they did — e.g. Write, Use, Spot, Choose, Build, Compare, Find, Fix, Turn, Explain. NEVER vague words like understand, know, learn, appreciate.',
    '- Be something they can PROVE by the end, by USING AI for this topic.',
    '- Behind the scenes, still tag the Bloom level it targets (in the "level" field) — but keep the visible text plain and jargon-free.',
    'Good example: "Write a clear prompt that gets a useful answer." Bad example: "Utilize prompt-engineering methodologies to optimize model outputs."',
    '',
    'Then design an ordered sequence of STEPS that teaches toward those objectives and PROVES each one:',
    `- Aim for ${shape.steps} steps total, and NEVER exceed ${PLAN_MAX_STEPS[format] || PLAN_MAX_STEPS.standard} steps including the recap. Alternate short teaching steps with hands-on steps.`,
    isQuest
      ? [
          'THIS IS A BUILD — the learner walks away with a real, finished artifact. Use the "build" step kind for the hands-on work (NOT quiz "activity" steps). Each "build" step has the learner CREATE one concrete piece of the final deliverable in their AI tool and paste it back; the pieces are assembled into their finished project at the end.',
          'Structure: open with ONE short "teach" intro (what they will build + what the finished result looks like). Then mostly "build" steps, each producing ONE concrete, save-able piece (a prompt, a template, a message, a checklist, a workflow outline) — insert a brief "teach" only when a new concept must come before building it (concept BEFORE building). EVERY objective is served by at least one "build" step. The pieces should add up to one coherent deliverable.',
          'A "build" step looks like: { "id":"s2", "kind":"build", "title":"short", "objectiveId":"o1", "build": { "brief":"what to create and why, concrete and tied to their real work (markdown)", "deliverableName":"short name of THIS piece, e.g. \'Welcome email template\'", "example":"a strong worked example they can model (markdown)", "reviewFocus":"what a great version includes — used to give them feedback" } }.',
          'Each piece must be self-contained text the learner can save and reuse — never require tools, files, or data they were not given.',
        ].join('\n')
      : '- EVERY objective must have at least one activity step that measures it. Activities are how the learner proves the objective — not just reading.',
    '- Vary the activity types across the lesson — use a MIX, not all the same. Available types:',
    '  • "mcq": multiple-choice. { question, options:[4 strings], correctIndex:0-3, optionFeedback:[4 short strings — for each option, why it is right or wrong], explanation }',
    '  • "write": learner writes something (e.g. a prompt) that AI grades. { instructions, gradingCriteria, passScore (0-100, default 70), placeholder }. The "instructions" must state EXACTLY what to write, in what form, and what a complete answer looks like. The "gradingCriteria" must describe ONLY what the instructions actually asked for — nothing more. If the instructions let the learner use their OWN example, the gradingCriteria must NOT require quoting any specific text/source. Never reference a file, PDF, or document the learner was not given inside this lesson.',
    '  • "match": match items in column A to column B. { instructions, pairs:[{left,right}] } (3-5 pairs)',
    '  • "scenario": pick the best action in a realistic situation. { situation, choices:[{text, correct:true|false, feedback}] } (3-4 choices, 1 correct)',
    '  • "order": put steps in the correct sequence. { instructions, items:[strings IN THE CORRECT ORDER] } (3-5 items)',
    '  • "categorize": sort items into the right groups. { instructions, buckets:[group names], items:[{text, bucket}] } (2-3 buckets, 4-6 items)',
    '- Make activities concrete and tied to the learner\'s real work where possible.',
    '- CLARITY (critical): every activity\'s instructions/question must be CRYSTAL CLEAR and self-contained. State exactly what to do, with what, and what a complete or correct answer looks like — a learner should never be unsure what is being asked. Provide any material they need INSIDE the activity. Never reference a document, file, PDF, link, or earlier context the learner was not actually given.',
    '- FORMATTING of any instructions/question/situation text: write readable markdown, NOT one run-on paragraph. Put multi-step directions as a numbered markdown list with each step on its OWN line ("1. ...\\n2. ...\\n3. ..."), use "- " bullets for lists, and **bold** for emphasis. Use real newlines (\\n) between steps — never cram "Step 1: ... Step 2: ..." into a single line.',
    '',
    'CRITICAL — ACTIVITIES MUST BE ANSWERABLE FROM THIS LESSON (do not test what you did not teach):',
    '- An activity may ONLY test ideas that an EARLIER teach step in THIS plan explicitly teaches. Never assess a concept the lesson did not cover.',
    '- Do NOT introduce new terms, product/tool field or node names, jargon, code, or syntax in an activity unless an earlier teach step taught that EXACT term in plain language first. (e.g. do not ask someone to match "output parser (JSON mode)" or "{{ $json.body }}" unless a step taught those by name.)',
    '- WATCH NAMED-TERM ACTIVITIES ESPECIALLY (match/categorize): if an activity names terms like "Vector store", "Retriever", "Generator", or "Chunk", the teach step IMMEDIATELY before it must introduce and define EACH of those exact terms by name. It is NOT enough to teach the idea under different words (e.g. teaching "Retrieve/Augment/Generate" does not cover the nouns "Retriever" or "Vector store"). Title that teach step so it clearly sets up those terms, and only use terms you are confident the preceding teach step will define.',
    '- Test the practical IDEA and judgment, not vocabulary recall or memorizing a tool\'s UI/field names.',
    '- For EACH activity, ensure the teach step(s) before it build exactly what the learner needs to answer it confidently, assuming zero prior knowledge beyond this lesson.',
    '- Match the difficulty to the learner level below. A learner should be able to pass every activity using only what this lesson taught.',
    isDevTier ? null : 'The learner is NOT a developer — keep everything in plain language, no code, no node/field names, no expressions.',
    department ? `They work in ${department}.` : null,
    Array.isArray(top_tasks) && top_tasks.length ? `Their tasks: ${top_tasks.join(', ')}. Use these in examples/activities.` : null,
    buildToolGuidance(tools, catalog),
    '',
    'Return ONLY JSON (no fences):',
    '{',
    '  "objectives": [ { "id": "o1", "level": "Apply", "text": "Apply ... (measurable, Bloom-verb-first)" } ],',
    '  "steps": [',
    '    { "id": "s1", "kind": "teach", "title": "short title", "objectiveIds": ["o1"] },',
    isQuest
      ? '    { "id": "s2", "kind": "build", "objectiveId": "o1", "build": { "brief": "...", "deliverableName": "...", "example": "...", "reviewFocus": "..." } },'
      : '    { "id": "s2", "kind": "activity", "objectiveId": "o1", "activityType": "mcq", "activity": { ...spec for that type... } },',
    '    { "id": "sN", "kind": "recap", "title": "Recap" }',
    '  ]',
    '}',
    'The LAST step must be kind "recap". The FIRST step must be kind "teach" (an intro).',
    looksLikeSpecificTool(topic)
      ? `\nIMPORTANT — "${topic}" names a SPECIFIC, possibly recent AI product or feature, not a general skill. Do NOT substitute the parent brand or teach generic basics. If you are not fully certain of its real, current capabilities, use the web_search tool to look them up FIRST, then build the objectives and steps around what it actually does. Never invent features; if you genuinely cannot confirm it exists, say so plainly in the intro step and teach the closest real workflow.`
      : null,
  ].filter(Boolean).join('\n');

  // Generate + parse can occasionally fail (truncated/malformed JSON or a
  // transient API hiccup). Retry a couple of times before giving up so a single
  // bad response doesn't surface as a hard "Failed to design the lesson".
  const userMsg = `Design the lesson plan for "${topic}".`;
  // Ground niche/specific tool topics with a live web lookup. If the web-search
  // tool errors (e.g. not enabled on the account), we drop it and retry plainly
  // so the lesson still generates — just without fresh grounding.
  let useWebSearch = looksLikeSpecificTool(topic);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await getClient().messages.create({
        model: MODEL,
        max_tokens: PLAN_TOKENS[format] || PLAN_TOKENS.standard,
        system,
        messages: [{ role: 'user', content: userMsg }],
        ...(useWebSearch ? { tools: [WEB_SEARCH_TOOL] } : {}),
      });
      let text = responseText(response).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Tolerate any prose around the JSON object.
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('No JSON in plan response');
        parsed = JSON.parse(m[0]);
      }

      const objectives = (Array.isArray(parsed.objectives) ? parsed.objectives : [])
        .filter((o) => o && o.text)
        .map((o, i) => ({ id: o.id || `o${i + 1}`, level: o.level || '', text: String(o.text) }));

      const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
        .filter((s) => s && (s.kind === 'teach' || s.kind === 'activity' || s.kind === 'build' || s.kind === 'recap'))
        .map((s, i) => ({
          id: s.id || `s${i + 1}`,
          kind: s.kind,
          title: s.title || (s.kind === 'build' ? (s.build?.deliverableName || 'Build') : ''),
          objectiveIds: s.objectiveIds || (s.objectiveId ? [s.objectiveId] : []),
          objectiveId: s.objectiveId || null,
          activityType: s.kind === 'activity' ? (s.activityType || 'mcq') : null,
          activity: s.kind === 'activity' ? (s.activity || null) : null,
          build: s.kind === 'build' ? (s.build || null) : null,
        }))
        .filter((s) => (s.kind !== 'activity' || s.activity) && (s.kind !== 'build' || s.build));

      if (!objectives.length || !steps.length) throw new Error('Empty plan');
      const capped = clampPlanSteps(steps, PLAN_MAX_STEPS[format] || PLAN_MAX_STEPS.standard);
      return { objectives, steps: capped };
    } catch (error) {
      lastError = error;
      console.error(`Lesson plan attempt ${attempt} failed${useWebSearch ? ' (with web search)' : ''}:`, error.message);
      // If grounding itself failed, retry without it so generation still works.
      if (useWebSearch) useWebSearch = false;
    }
  }
  console.error('Lesson plan error (all attempts failed):', lastError?.message);
  throw new Error('Failed to design the lesson. Please try again.');
}

// Formative feedback on a piece the learner built and pasted during a Project
// Quest build step. Encouraging and constructive — NEVER blocks them from
// continuing (the piece is saved into their deliverable regardless). Returns
// { feedback, suggestions, looksGood }; falls back gracefully on any error.
export async function generateBuildReview(learnerProfile, options = {}) {
  const { topic = '', brief = '', deliverableName = '', reviewFocus = '', objective = '', content = '' } = options;
  const { tier } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const okFallback = { feedback: 'Nice work — this is now part of your project. Keep going!', suggestions: [], looksGood: true };
  if (!content.trim()) return { feedback: 'Add your work above, then I\'ll give you feedback.', suggestions: [], looksGood: false };
  try {
    const system = [
      `A learner is building a project: "${topic}". They just made one piece: "${deliverableName || 'their work'}".`,
      brief ? `What they were asked to make:\n${brief}` : null,
      reviewFocus ? `What a great version includes: ${reviewFocus}` : null,
      objective ? `This piece serves the goal: ${objective}` : null,
      'Give warm, SPECIFIC, constructive feedback on what they pasted. Lead with what genuinely works, then up to 2 concrete, actionable improvements. 2-4 sentences total. Coach tone — encouraging, never harsh. This is formative: they can revise, but they are NEVER blocked, and their piece is kept either way.',
      isDevTier ? null : 'Plain language, no code or jargon.',
      'Return ONLY JSON: { "feedback": "<markdown, 2-4 sentences>", "suggestions": ["0-2 short concrete improvements"], "looksGood": true|false }',
    ].filter(Boolean).join('\n');
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: `Here is what I made:\n\n${content}` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try { parsed = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
    if (!parsed?.feedback) return okFallback;
    return {
      feedback: String(parsed.feedback).trim(),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 2).map((s) => String(s).trim()).filter(Boolean) : [],
      looksGood: parsed.looksGood !== false,
    };
  } catch (error) {
    console.error('Build review error:', error);
    return okFallback;
  }
}

// End-of-lesson safety net: the learner said the lesson DIDN'T fully answer what
// they came for. Generate practical next steps to get them unstuck — where to
// look, how to troubleshoot, and a ready-to-paste prompt for their AI tool —
// tailored to what's still unclear. Returns { intro, steps:[{title,detail,url?}], prompt }.
export async function generateNextSteps(topic, learnerProfile, options = {}) {
  const { objectives = [], stillUnclear = '', format = 'standard' } = options;
  const { tier } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(learnerProfile);
  const primaryTool = tools[0];
  const objText = objectives.map((o) => `- ${o.text || o}`).join('\n');
  const fallback = {
    intro: 'Here are a few ways to dig deeper and get unstuck.',
    steps: [
      { title: 'Ask your AI tool to walk you through it', detail: 'Paste the prompt below and describe exactly where you got stuck.' },
    ],
    prompt: `I just took a lesson on "${topic}" but I'm still stuck on: [describe what's not working]. Walk me through it step by step, ask me clarifying questions, and give me a concrete next action.`,
  };
  try {
    const system = [
      `A learner just finished a lesson on "${topic}" but it did NOT fully answer what they came for.`,
      stillUnclear ? `What's still unclear / what they still need: "${stillUnclear}".` : null,
      objText ? `The lesson covered:\n${objText}` : null,
      'Give them genuinely useful NEXT STEPS to get unstuck. 2-4 concrete moves: where to look (official docs/resources), how to troubleshoot it themselves, and what to try next. Practical and specific to the topic, not generic "keep learning" filler.',
      'Include ONE ready-to-paste prompt they can drop into their AI tool to get personalized help on exactly their issue.',
      primaryTool ? `Their AI tool is ${primaryTool.label} — write the prompt for that.` : null,
      'Only include a "url" for a step if it is a real, well-known OFFICIAL site you are confident about (e.g. docs.n8n.io, platform.openai.com, support.google.com). Never invent or guess a URL — omit it if unsure.',
      isDevTier ? null : 'Plain language, no code or jargon.',
      'Return ONLY JSON: { "intro": "<one short line>", "steps": [ { "title": "<short>", "detail": "<1-2 sentences>", "url": "<optional official url>" } ], "prompt": "<ready-to-paste prompt>" }',
    ].filter(Boolean).join('\n');
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: `Give me next steps for "${topic}".` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try { parsed = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
    if (!parsed) return fallback;
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((s) => s && s.title).slice(0, 4).map((s) => ({
          title: String(s.title).trim(),
          detail: String(s.detail || '').trim(),
          url: typeof s.url === 'string' && /^https?:\/\//.test(s.url) ? s.url.trim() : undefined,
        }))
      : [];
    return {
      intro: String(parsed.intro || fallback.intro).trim(),
      steps: steps.length ? steps : fallback.steps,
      prompt: String(parsed.prompt || fallback.prompt).trim(),
    };
  } catch (error) {
    console.error('Next steps error:', error);
    return fallback;
  }
}

// Generate the teaching content for ONE planned teach step. Content is created
// lazily as the learner advances, but the plan already fixed the step count.
// Keep only well-formed interactive blocks, clamped to safe sizes, so a stray
// or malformed block from the model can never break the renderer.
function sanitizeTeachBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const b of raw.slice(0, 3)) {
    if (!b || typeof b !== 'object') continue;
    const title = b.title ? String(b.title).trim() : '';
    if (b.type === 'flashcards' && Array.isArray(b.cards)) {
      const cards = b.cards
        .filter((c) => c && c.front && c.back)
        .slice(0, 5)
        .map((c) => ({ front: String(c.front).trim(), back: String(c.back).trim() }));
      if (cards.length) out.push({ type: 'flashcards', title, cards });
    } else if (b.type === 'reveal' && b.content) {
      out.push({
        type: 'reveal',
        title: title || 'Example',
        prompt: b.prompt ? String(b.prompt).trim() : 'Show me an example',
        content: String(b.content).trim(),
      });
    } else if (b.type === 'tabs' && Array.isArray(b.tabs)) {
      const tabs = b.tabs
        .filter((t) => t && t.label && t.content)
        .slice(0, 4)
        .map((t) => ({ label: String(t.label).trim(), content: String(t.content).trim() }));
      if (tabs.length >= 2) out.push({ type: 'tabs', title, tabs });
    } else if ((b.type === 'diagram' || b.type === 'steps' || b.type === 'hotspots') && Array.isArray(b.steps)) {
      const steps = b.steps
        .filter((s) => s && s.label && s.detail)
        .slice(0, 6)
        .map((s) => ({ label: String(s.label).trim(), detail: String(s.detail).trim() }));
      if (steps.length >= 2) out.push({ type: 'diagram', title, steps });
    }
  }
  return out;
}

export async function generateTeachStep(topic, learnerProfile, options = {}) {
  const { objectives = [], step = {}, priorTitles = [], priorContent = [], upcoming = null } = options;
  const { tier, department, top_tasks } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(learnerProfile);
  const catalog = options.catalog || (await getMergedTools());

  const objText = objectives.map((o) => `- (${o.level}) ${o.text}`).join('\n');
  // The ACTUAL text the learner has already been shown, so this step builds on
  // it coherently and never contradicts or repeats it (the lesson "remembers").
  const taughtBlock = Array.isArray(priorContent) && priorContent.length
    ? priorContent.map((p, i) => `[${i + 1}] ${p.title ? p.title + ': ' : ''}${p.message || ''}`).join('\n\n')
    : '';
  // What the learner will be asked to DO next, so the worked example prepares
  // them for exactly that (no leap from passive reading to a graded task) — and,
  // critically, the EXACT terms/items the activity will quiz, so this step
  // defines each one by name (the activity must never test an unintroduced term).
  const covers = Array.isArray(upcoming?.covers) ? upcoming.covers.filter(Boolean) : [];
  const upcomingLine = upcoming && (upcoming.objective || upcoming.activityType)
    ? [
        `RIGHT AFTER this step, the learner faces an activity (${upcoming.activityType || 'exercise'}) that measures: "${upcoming.objective || ''}". Your worked example MUST demonstrate exactly the kind of task/thinking that activity needs, using what's been taught — never assume knowledge the lesson hasn't shown yet.`,
        covers.length
          ? `That activity will require the learner to know these EXACT terms/items: ${covers.map((c) => `"${c}"`).join(', ')}. You MUST clearly introduce and define EACH of them BY NAME, in plain language, within THIS step (prose or an interactive block) — do not just imply them or use different wording. If you teach RAG as "Retrieve/Augment/Generate" but the activity names "Retriever", "Vector store", or "Chunk", define those nouns explicitly too.`
          : null,
      ].filter(Boolean).join('\n')
    : '';
  const system = [
    `You are teaching ONE step of a hands-on lesson on "${topic}".`,
    'The lesson serves these learning objectives (the source of truth):',
    objText,
    '',
    taughtBlock
      ? `WHAT THE LEARNER HAS ALREADY BEEN TAUGHT in this lesson (build directly on this — do NOT repeat it or contradict it):\n${taughtBlock}`
      : (priorTitles.length ? `Already covered: ${priorTitles.join('; ')}. Do NOT repeat these.` : 'This is the opening step — hook them with what this is and why it matters for their work.'),
    '',
    `This step's focus: "${step.title || 'Teach'}".`,
    upcomingLine,
    '',
    'HOW TO STRUCTURE THIS STEP (important):',
    '1. CONCEPT FIRST — open with the idea in plain language: what it is and why it matters for their work. Always teach the concept BEFORE any example of it.',
    '2. THEN A CONCRETE EXAMPLE — show the concept in action with a real, worked example tied to their role/tasks. Never show an example before the concept it illustrates.',
    '',
    'MAKE IT INTERACTIVE: include 1-2 interactive blocks so the learner engages instead of skims. Put the CONCEPT prose in "message"; put examples/explorables in "blocks". Pick the block type(s) that best fit this step — you need not use all, and a step with nothing to interact with may use an empty array.',
    'Block types (array order = render order, shown after the message):',
    '- Flashcards — a term/trigger on the front, flip to reveal its meaning. The "back" is clean markdown rendered with bold/bullets: ONE bold lead-in phrase capturing the core idea, then the plain-language definition, then the example on its OWN line written as: Example: "the example". Do NOT wrap phrases in single * asterisks. e.g. {"type":"flashcards","title":"optional","cards":[{"front":"A trigger","back":"**Starts the workflow.** The event that kicks everything off.\\nExample: \\"When a new form is submitted\\""}]} (2-5 cards).',
    '- Reveal example — concept stays visible, the example is hidden until tapped (perfect for concept-before-example): {"type":"reveal","title":"short","prompt":"Show me an example","content":"the worked example (markdown)"}.',
    '- Compare tabs — switch between related items (e.g. the 3 common error types): {"type":"tabs","title":"optional","tabs":[{"label":"short","content":"markdown"}]} (2-4 tabs).',
    '- Clickable diagram — the learner taps each step/node to learn what it does: {"type":"diagram","title":"short","steps":[{"label":"node name","detail":"what it does + why"}]} (2-6 steps).',
    'Keep card backs, tab content, and step details to 1-3 sentences each.',
    '',
    'OTHER RULES:',
    '- Teach how to USE AI for this — show, do not just explain.',
    '- Keep the "message" concept to 2-4 short sentences. Use real newlines, "- " bullets, **bold**. A ```mermaid flowchart LR``` (3-6 plain-text nodes, no punctuation in labels) or a markdown table is welcome in the message when a static visual helps — but if you use a clickable diagram block, do NOT also draw the same thing in mermaid.',
    isDevTier ? '- The learner may be technical; light code is okay (in blocks too).' : '- The learner is NOT a developer — plain language, no code or jargon anywhere (message AND blocks). Define any term in parentheses.',
    department ? `- They work in ${department}.` : null,
    Array.isArray(top_tasks) && top_tasks.length ? `- Use their tasks (${top_tasks.join(', ')}) for examples.` : null,
    buildToolGuidance(tools, catalog),
    '',
    'Return ONLY JSON (no fences): { "message": "the CONCEPT teaching (markdown)", "blocks": [ /* 0-2 interactive blocks */ ], "keyPoints": ["0-3 short takeaways"] }',
  ].filter(Boolean).join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1600,
      system,
      messages: [{ role: 'user', content: `Teach the step "${step.title || ''}".` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Model wrapped the JSON in prose or trailing text — extract the object.
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      parsed = JSON.parse(m[0]);
    }
    const message = typeof parsed.message === 'string' ? parsed.message.trim() : '';
    if (!message) throw new Error('empty message');
    return {
      message,
      blocks: sanitizeTeachBlocks(parsed.blocks),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
    };
  } catch (error) {
    console.error('Teach step error:', error);
    throw new Error('Failed to generate this step. Please try again.');
  }
}

// Hidden quality review of a generated lesson plan. Runs behind the scenes so
// admins can spot weak lessons; learners never see it. Returns a score + issues.
export async function generateLessonQA(plan, topic, format) {
  const objText = (plan?.objectives || []).map((o) => `- (${o.level}) ${o.text}`).join('\n');
  const stepsText = (plan?.steps || [])
    .map((s) => s.kind === 'activity' ? `- activity (${s.activityType}) → ${s.objectiveId}` : `- ${s.kind}: ${s.title || ''}`)
    .join('\n');
  const system = [
    'You are a strict instructional-design reviewer. Review this AI micro-lesson PLAN for quality and return a score.',
    'Check, against Bloom\'s Taxonomy best practice:',
    '1. Objectives start with a clear, provable action verb (plain everyday verbs like Write/Use/Spot/Build are great) and are NOT vague (no "understand/know/learn"). They should be SHORT (≤12 words) and free of big/corporate words (leverage, utilize, orchestrate, synthesize, optimize) — flag any that are long or jargon-heavy.',
    '2. Every objective is backed by at least one activity that actually measures it.',
    '3. Activities are valid, varied, and aligned to their objective.',
    '4. The depth fits the format and teaches USING AI for the topic.',
    'Return ONLY JSON: { "score": 0-100, "verdict": "one-line summary", "issues": ["specific problems, empty if none"] }.',
  ].join('\n');
  const user = `Topic: ${topic}\nFormat: ${format}\n\nObjectives:\n${objText}\n\nSteps:\n${stepsText}`;
  try {
    const response = await getClient().messages.create({
      model: MODELS.haiku,
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: user }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score) || 0)),
      verdict: typeof parsed.verdict === 'string' ? parsed.verdict : '',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch (error) {
    console.error('Lesson QA error:', error);
    return null;
  }
}

// Answer a learner's free-form question mid-lesson (becomes an inserted step).
export async function generateLessonAnswer(topic, learnerProfile, options = {}) {
  const { objectives = [], question = '', priorContent = [], currentStep = '', recentQa = [] } = options;
  const { tier } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const objText = objectives.map((o) => `- ${o.text}`).join('\n');
  // Everything the learner has actually been shown so far in THIS lesson, so the
  // answer is grounded in the lesson (never "I don't have the history").
  const taughtBlock = Array.isArray(priorContent) && priorContent.length
    ? priorContent.map((p, i) => `[${i + 1}] ${p.title ? p.title + ': ' : ''}${p.message || ''}`).join('\n\n')
    : '';
  const qaBlock = Array.isArray(recentQa) && recentQa.length
    ? recentQa.map((qa) => `Q: ${qa.q}\nA: ${qa.a}`).join('\n\n')
    : '';
  const system = [
    `A learner is partway through a lesson on "${topic}" and is talking to you in the in-lesson chat. You are their hands-on coach right here in the lesson. You DO have the lesson so far — it is provided below. Answer using it; never say you lack the history or context.`,
    'You can help with three things, and should figure out which one they need: (1) ANSWER questions about the lesson content, grounded in what was taught; (2) HELP THEM USE THEIR AI TOOL — walk them through navigating it, where to click, and how to phrase a prompt, step by step; (3) UNSTICK THEM when they are confused, frustrated, or not sure what to do next — reassure them and give one concrete next action.',
    'Keep it concise and conversational (usually 2-4 sentences), but when they need to navigate their tool or are stuck, give clear step-by-step instructions (short numbered steps) — being genuinely helpful matters more than being brief. Do NOT invent new graded exercises or activities — coach them through the lesson they are in.',
    'If the learner can\'t find a button, menu, or field in their AI tool (e.g. "I don\'t see it" / "I don\'t see it still"), don\'t keep guessing at the layout. After one round of text directions hasn\'t worked, tell them to take a screenshot of their screen and paste it into their AI tool (Claude, ChatGPT, and Gemini all accept images) with a question like "Where is X in this screenshot?" — it can read their exact interface and point to it.',
    'Be warm and encouraging — never make them feel behind for asking. End with a light nudge back to the lesson when it fits.',
    objText ? `Lesson objectives:\n${objText}` : null,
    taughtBlock ? `WHAT THE LEARNER HAS BEEN TAUGHT SO FAR:\n${taughtBlock}` : null,
    currentStep ? `They are currently on the step: "${currentStep}".` : null,
    qaBlock ? `Earlier questions in this lesson:\n${qaBlock}` : null,
    isDevTier ? null : 'The learner is NOT a developer — plain language, no code.',
    'Format the answer as readable markdown (bullets/bold/numbered steps where useful, real newlines).',
    'Return ONLY JSON (no fences): { "message": "your answer (markdown)", "keyPoints": [] }',
  ].filter(Boolean).join('\n');
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: question }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { message: text };
    }
    return { message: typeof parsed.message === 'string' ? parsed.message : '', keyPoints: [] };
  } catch (error) {
    console.error('Lesson answer error:', error);
    throw new Error('Failed to answer. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Video lesson (narrated slideshow)
// ---------------------------------------------------------------------------

// A "video" is a full, linear lesson generated in one call: a sequence of scenes
// the player narrates aloud (OpenAI TTS) and auto-advances through. This is the
// "prefer to watch" alternative to the interactive, chat-driven lesson.
const VIDEO_SCENE_GUIDE = {
  quick_tip: 'exactly 2 short scenes (the single insight, then a one-line "try this" wrap-up). This is a 60-second tip, so keep TOTAL narration to about 140-150 spoken words — tight and punchy, no filler.',
  standard: '4-6 scenes (hook, why it matters, 2-3 how-to scenes with a concrete AI prompt, wrap-up).',
  deep_dive: '7-9 scenes (hook, why it matters, several how-to scenes with concrete AI prompts and examples, a practice idea, wrap-up).',
  project_quest: 'one hook scene, one scene per project step (in order), and a wrap-up scene that points them to go build it for real.',
};

export function buildVideoScriptPrompt(topic, learnerProfile, options = {}) {
  const { display_name, department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';
  const format = options.format || 'standard';
  const tools = resolveTools(learnerProfile);
  const primaryTool = tools[0];

  const tasksContext = Array.isArray(top_tasks) && top_tasks.length > 0
    ? `- Their day-to-day tasks: ${top_tasks.join(', ')}. Use these as the context for examples.`
    : null;

  return [
    `You are scripting a short narrated video lesson on: "${topic}".`,
    'The output is NOT interactive — it is a linear script that will be READ ALOUD by a text-to-speech voice and shown as auto-advancing slides. Write it like a friendly narrator speaking to one person.',
    '',
    'AI APPLICATION FOCUS (CRITICAL):',
    '- Teach how to USE AI for the topic — show how AI makes it faster, better, or easier, not how to do it manually.',
    '- Include at least one concrete AI prompt the learner could try, described in spoken language.',
    buildToolGuidance(tools, options.catalog),
    '- When referring to the technology in general (not a specific product), say "a large language model (LLM)."',
    '',
    'SCRIPT RULES:',
    `- Produce ${VIDEO_SCENE_GUIDE[format] || VIDEO_SCENE_GUIDE.standard}`,
    '- Each scene\'s narration is 2-4 short, spoken sentences. Conversational, warm, and clear — like a coach talking, not a textbook.',
    '- narration is PLAIN SPOKEN TEXT ONLY: no markdown, no asterisks, no backticks, no code blocks, no diagrams, no bullet characters, no headings. It will be spoken verbatim.',
    '- Spell out anything that would sound odd read aloud. Define a technical term in plain words the first time you use it.',
    '- The first scene should hook the learner with why this matters for their actual work. The last scene should wrap up with one thing to try next.',
    '',
    'Return ONLY a JSON object (no markdown fences, no text outside it) with:',
    '- title (string): the video title (short).',
    '- scenes (array): each scene is { title (string, short on-screen heading), narration (string, the spoken script), keyPoints (array of 0-3 very short on-screen bullet strings) }.',
    '',
    'Rules:',
    '- keyPoints are brief on-screen text only (a few words each), NOT spoken. Use 0-3 per scene; leave [] when a scene needs no bullets.',
    !isDevTier
      ? `- The learner is NOT a developer. No code, terminal commands, or jargon. Focus on practical prompting in ${primaryTool.label}.`
      : '- The learner is a developer. You may reference code and technical concepts.',
    display_name ? `- The learner's name is ${display_name}. You may greet them once.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}. Make examples relevant.` : null,
    tasksContext,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

// A narrated Project Quest walks through the quest's own curated steps, so it can
// run longer than a regular deep dive (intro + one scene per step + wrap-up).
const VIDEO_FORMAT_TOKENS = {
  quick_tip: 900,
  standard: 1600,
  deep_dive: 2600,
  project_quest: 3200,
};

// Build a narrated-script prompt for a Project Quest from its curated steps, so the
// narration faithfully walks through the real project rather than improvising.
export function buildQuestScriptPrompt(quest, learnerProfile, options = {}) {
  const { display_name, department, sub_team, tier, goal } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const isDevTier = tierLabel === 'developer';
  const tools = resolveTools(learnerProfile);
  const primaryTool = tools[0];

  const stepLines = (quest.steps || []).map((s, i) => {
    const tips = Array.isArray(s.tips) && s.tips.length ? ` Tips: ${s.tips.join('; ')}.` : '';
    return `Step ${i + 1} — ${s.title}: ${s.description} Task: ${s.task} Success: ${s.successCriteria}.${tips}`;
  }).join('\n');

  return [
    `You are scripting a short narrated walkthrough of a guided project called "${quest.title}".`,
    `Project goal: ${quest.description}`,
    'The output is NOT interactive — it is a linear script that will be READ ALOUD by a text-to-speech voice and shown as auto-advancing slides. Write it like a friendly coach walking someone through the project so they know exactly what they will build before they start.',
    '',
    'THE PROJECT STEPS (narrate these in order, one scene each — do not invent new steps or skip any):',
    stepLines,
    '',
    'AI APPLICATION FOCUS (CRITICAL):',
    '- This project is about USING AI for real work. For each step, describe how AI helps and give at least one concrete prompt idea in spoken language where it fits.',
    buildToolGuidance(tools, options.catalog),
    '- When referring to the technology in general (not a specific product), say "a large language model (LLM)."',
    '',
    'SCRIPT RULES:',
    `- Produce ${VIDEO_SCENE_GUIDE.project_quest}`,
    '- Each scene\'s narration is 2-4 short, spoken sentences. Conversational, warm, and clear — like a coach talking, not a textbook.',
    '- narration is PLAIN SPOKEN TEXT ONLY: no markdown, no asterisks, no backticks, no code blocks, no diagrams, no bullet characters, no headings. It will be spoken verbatim.',
    '- Spell out anything that would sound odd read aloud. Define a technical term in plain words the first time you use it.',
    '- The first scene hooks the learner with what they will walk away with. The final scene encourages them to open the project and build it for real.',
    '',
    'Return ONLY a JSON object (no markdown fences, no text outside it) with:',
    '- title (string): the walkthrough title (short).',
    '- scenes (array): each scene is { title (string, short on-screen heading), narration (string, the spoken script), keyPoints (array of 0-3 very short on-screen bullet strings) }.',
    '',
    'Rules:',
    '- keyPoints are brief on-screen text only (a few words each), NOT spoken. Use 0-3 per scene; leave [] when a scene needs no bullets.',
    !isDevTier
      ? `- The learner is NOT a developer. No code, terminal commands, or jargon. Focus on practical prompting in ${primaryTool.label}.`
      : '- The learner is a developer. You may reference code and technical concepts.',
    display_name ? `- The learner's name is ${display_name}. You may greet them once.` : null,
    department ? `- They work in ${department}${sub_team ? ` (${sub_team})` : ''}. Make examples relevant.` : null,
    goal ? `- Their learning goal: ${goal}` : null,
  ].filter(Boolean).join('\n');
}

export async function generateVideoScript(topic, learnerProfile, options = {}) {
  const format = options.format || 'standard';
  const maxTokens = VIDEO_FORMAT_TOKENS[format] || VIDEO_FORMAT_TOKENS.standard;

  try {
    const catalog = await getMergedTools();
    const system = options.quest
      ? buildQuestScriptPrompt(options.quest, learnerProfile, { ...options, catalog })
      : buildVideoScriptPrompt(topic, learnerProfile, { ...options, catalog });
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: options.quest
        ? `Script the narrated walkthrough of the "${options.quest.title}" project.`
        : `Script the narrated video lesson on "${topic}".` }],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);

    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes
          .filter((s) => s && typeof s.narration === 'string' && s.narration.trim())
          .map((s) => ({
            title: typeof s.title === 'string' ? s.title : '',
            narration: s.narration.trim(),
            keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.filter((k) => typeof k === 'string' && k.trim()).slice(0, 3) : [],
          }))
      : [];

    if (scenes.length === 0) {
      throw new Error('No scenes generated');
    }

    return { title: typeof parsed.title === 'string' ? parsed.title : topic, scenes };
  } catch (error) {
    console.error('Video script API error:', error);
    throw new Error('Failed to generate the video lesson. Please try again.');
  }
}
