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
  ].filter(Boolean).join('\n');
}

export async function generateChatReply(messages, learnerProfile) {
  try {
    const catalog = await getMergedTools();
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 400,
      system: buildChatSystemPrompt(learnerProfile, catalog),
      messages,
    });
    return response.content[0].text;
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
      max_tokens: 2000,
      system: buildDiscoverSystemPrompt(learnerProfile, catalog),
      messages: [
        { role: 'user', content: `Here is a description of my work:\n\n${workDescription}` },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    return JSON.parse(text);
  } catch (error) {
    console.error('Discover API error:', error);
    throw new Error('Failed to find opportunities. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// Suggested topics (personalized to the learner's role)
// ---------------------------------------------------------------------------

export function buildSuggestedTopicsPrompt(learnerProfile) {
  const { department, sub_team, tier, goal, top_tasks } = learnerProfile || {};
  const tierLabel = tier || 'beginner';
  const tasks = Array.isArray(top_tasks) && top_tasks.length ? top_tasks.join(', ') : null;

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
  ].filter(Boolean).join('\n');
}

export async function generateSuggestedTopics(learnerProfile) {
  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 700,
      system: buildSuggestedTopicsPrompt(learnerProfile),
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
    };
  } catch (error) {
    console.error('Tool description error:', error);
    return { strengths: '', url: '' };
  }
}

// Recommend the single best AI tool for a given lesson topic, from the catalog,
// with a one-line why. Independent of lesson generation so it can't affect the
// lesson JSON. Returns { tool, why } (label string + reason) or null on failure.
export async function generateToolRecommendation(topic) {
  try {
    const catalog = await getMergedTools();
    if (!catalog?.length) return null;
    const list = catalog
      .map((t) => `- ${t.label}${t.strengths ? `: best for ${t.strengths}` : ''}`)
      .join('\n');
    const system = [
      'You recommend the single best AI tool for a given lesson topic.',
      'Choose exactly ONE tool from this list — the one genuinely best suited to the topic:',
      list,
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
      'This is a Quick Tip (60 seconds).',
      'The opening slide is phase "intro" with the single actionable insight in full, plus exactly ONE button: { label: "Got it", action: "complete" }. Do NOT add a "Try it yourself" or any practice button — the learner starts practice from the chat box.',
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
  standard: { objectives: 2, label: 'Quick Lesson (3-5 min)', steps: '4-6' },
  deep_dive: { objectives: 3, label: 'Deep Dive (15-20 min)', steps: '7-10' },
  project_quest: { objectives: 4, label: 'Project Quest', steps: '8-12' },
};

const PLAN_TOKENS = { standard: 4000, deep_dive: 7000, project_quest: 7000 };

// Generate a full lesson plan: measurable Bloom-framed learning objectives plus
// an ordered list of steps (teach + interactive activity). Every objective is
// backed by at least one activity the learner must pass to prove mastery.
// Activity specs are fully self-contained so the client can play + grade them.
export async function generateLessonPlan(topic, learnerProfile, options = {}) {
  const format = options.format === 'deep_dive' || options.format === 'project_quest'
    ? options.format : 'standard';
  const shape = PLAN_SHAPE[format];
  const { tier, department, top_tasks } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(learnerProfile);
  const catalog = options.catalog || (await getMergedTools());

  const system = [
    `You design a hands-on AI micro-lesson on: "${topic}" — a ${shape.label}.`,
    '',
    'LEARNING OBJECTIVES ARE THE SOURCE OF TRUTH. Write them first, then build everything to serve them.',
    `Write exactly ${shape.objectives} objectives. Each MUST:`,
    '- Start with a measurable Bloom\'s Taxonomy verb (e.g. Identify, Apply, Analyze, Compare, Create, Evaluate). NEVER use vague words like understand, know, learn, appreciate.',
    '- Be something the learner can PROVE they can do by the end, by USING AI for this topic.',
    '- Include the Bloom level it targets.',
    '',
    'Then design an ordered sequence of STEPS that teaches toward those objectives and PROVES each one:',
    `- Aim for ${shape.steps} steps total. Alternate short teaching steps with interactive activities.`,
    '- EVERY objective must have at least one activity step that measures it. Activities are how the learner proves the objective — not just reading.',
    '- Vary the activity types across the lesson — use a MIX, not all the same. Available types:',
    '  • "mcq": multiple-choice. { question, options:[4 strings], correctIndex:0-3, optionFeedback:[4 short strings — for each option, why it is right or wrong], explanation }',
    '  • "write": learner writes something (e.g. a prompt) that AI grades. { instructions, gradingCriteria, passScore (0-100, default 70), placeholder }',
    '  • "match": match items in column A to column B. { instructions, pairs:[{left,right}] } (3-5 pairs)',
    '  • "scenario": pick the best action in a realistic situation. { situation, choices:[{text, correct:true|false, feedback}] } (3-4 choices, 1 correct)',
    '  • "order": put steps in the correct sequence. { instructions, items:[strings IN THE CORRECT ORDER] } (3-5 items)',
    '  • "categorize": sort items into the right groups. { instructions, buckets:[group names], items:[{text, bucket}] } (2-3 buckets, 4-6 items)',
    '- Make activities concrete and tied to the learner\'s real work where possible.',
    isDevTier ? null : 'The learner is NOT a developer — keep everything in plain language, no code.',
    department ? `They work in ${department}.` : null,
    Array.isArray(top_tasks) && top_tasks.length ? `Their tasks: ${top_tasks.join(', ')}. Use these in examples/activities.` : null,
    buildToolGuidance(tools, catalog),
    '',
    'Return ONLY JSON (no fences):',
    '{',
    '  "objectives": [ { "id": "o1", "level": "Apply", "text": "Apply ... (measurable, Bloom-verb-first)" } ],',
    '  "steps": [',
    '    { "id": "s1", "kind": "teach", "title": "short title", "objectiveIds": ["o1"] },',
    '    { "id": "s2", "kind": "activity", "objectiveId": "o1", "activityType": "mcq", "activity": { ...spec for that type... } },',
    '    { "id": "sN", "kind": "recap", "title": "Recap" }',
    '  ]',
    '}',
    'The LAST step must be kind "recap". The FIRST step must be kind "teach" (an intro).',
  ].filter(Boolean).join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: PLAN_TOKENS[format] || PLAN_TOKENS.standard,
      system,
      messages: [{ role: 'user', content: `Design the lesson plan for "${topic}".` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Tolerate any prose around the JSON object.
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) {
        console.error('Lesson plan: no JSON found. Raw length:', text.length, 'head:', text.slice(0, 200));
        throw new Error('No JSON in plan response');
      }
      parsed = JSON.parse(m[0]);
    }

    const objectives = (Array.isArray(parsed.objectives) ? parsed.objectives : [])
      .filter((o) => o && o.text)
      .map((o, i) => ({ id: o.id || `o${i + 1}`, level: o.level || '', text: String(o.text) }));

    const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
      .filter((s) => s && (s.kind === 'teach' || s.kind === 'activity' || s.kind === 'recap'))
      .map((s, i) => ({
        id: s.id || `s${i + 1}`,
        kind: s.kind,
        title: s.title || '',
        objectiveIds: s.objectiveIds || (s.objectiveId ? [s.objectiveId] : []),
        objectiveId: s.objectiveId || null,
        activityType: s.kind === 'activity' ? (s.activityType || 'mcq') : null,
        activity: s.kind === 'activity' ? (s.activity || null) : null,
      }))
      .filter((s) => s.kind !== 'activity' || s.activity);

    if (!objectives.length || !steps.length) throw new Error('Empty plan');
    return { objectives, steps };
  } catch (error) {
    console.error('Lesson plan error:', error);
    throw new Error('Failed to design the lesson. Please try again.');
  }
}

// Generate the teaching content for ONE planned teach step. Content is created
// lazily as the learner advances, but the plan already fixed the step count.
export async function generateTeachStep(topic, learnerProfile, options = {}) {
  const { objectives = [], step = {}, priorTitles = [] } = options;
  const { tier, department, top_tasks } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const tools = resolveTools(learnerProfile);
  const catalog = options.catalog || (await getMergedTools());

  const objText = objectives.map((o) => `- (${o.level}) ${o.text}`).join('\n');
  const system = [
    `You are teaching ONE step of a hands-on lesson on "${topic}".`,
    'The lesson serves these learning objectives (the source of truth):',
    objText,
    '',
    `This step's focus: "${step.title || 'Teach'}".`,
    priorTitles.length ? `Already covered: ${priorTitles.join('; ')}. Do NOT repeat these.` : 'This is the opening step — hook them with what this is and why it matters for their work.',
    '',
    'RULES:',
    '- Teach how to USE AI for this — show, do not just explain.',
    '- 2-4 short sentences. Lead with a visual where useful: a ```mermaid flowchart LR``` (3-6 plain-text nodes, no punctuation in labels) or a markdown table.',
    '- Use **bold** and bullets. One idea per step.',
    isDevTier ? '- The learner may be technical; light code is okay.' : '- The learner is NOT a developer — plain language, no code or jargon. Define any term in parentheses.',
    department ? `- They work in ${department}.` : null,
    Array.isArray(top_tasks) && top_tasks.length ? `- Use their tasks (${top_tasks.join(', ')}) for examples.` : null,
    buildToolGuidance(tools, catalog),
    '',
    'Return ONLY JSON (no fences): { "message": "the teaching content (markdown)", "keyPoints": ["0-3 short takeaways"] }',
  ].filter(Boolean).join('\n');

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: `Teach the step "${step.title || ''}".` }],
    });
    let text = response.content[0].text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text);
    return {
      message: typeof parsed.message === 'string' ? parsed.message : '',
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
    '1. Objectives start with a measurable Bloom verb and are NOT vague (no "understand/know/learn").',
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
  const { objectives = [], question = '' } = options;
  const { tier } = learnerProfile || {};
  const isDevTier = tier === 'developer';
  const objText = objectives.map((o) => `- ${o.text}`).join('\n');
  const system = [
    `A learner is in a lesson on "${topic}" and asked a question. Answer it helpfully and concisely (2-4 sentences), tying back to the lesson where relevant.`,
    objText ? `Lesson objectives:\n${objText}` : null,
    isDevTier ? null : 'The learner is NOT a developer — plain language, no code.',
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
    const parsed = JSON.parse(text);
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
  quick_tip: '2-3 scenes (hook, the single insight, a one-line wrap-up).',
  standard: '4-6 scenes (hook, why it matters, 2-3 how-to scenes with a concrete AI prompt, wrap-up).',
  deep_dive: '7-9 scenes (hook, why it matters, several how-to scenes with concrete AI prompts and examples, a practice idea, wrap-up).',
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

const VIDEO_FORMAT_TOKENS = {
  quick_tip: 900,
  standard: 1600,
  deep_dive: 2600,
};

export async function generateVideoScript(topic, learnerProfile, options = {}) {
  const format = options.format || 'standard';
  const maxTokens = VIDEO_FORMAT_TOKENS[format] || VIDEO_FORMAT_TOKENS.standard;

  try {
    const catalog = await getMergedTools();
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: buildVideoScriptPrompt(topic, learnerProfile, { ...options, catalog }),
      messages: [{ role: 'user', content: `Script the narrated video lesson on "${topic}".` }],
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
