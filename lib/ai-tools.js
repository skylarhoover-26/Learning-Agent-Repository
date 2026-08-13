// Single source of truth for the external AI tools learners use alongside the
// coach. The whole platform teaches people to do the actual work in THEIR own
// AI tool(s) (kept open in a separate window) — this module holds the catalog,
// the preference helpers, and the prompt guidance injected into every generator.
//
// Learners pick every tool they have (no "default" to set) — the coach picks the
// best one for each lesson's topic. We fall back to Gemini for generation only
// when a learner hasn't picked anything yet, since everyone at the company has it
// through Google Workspace. A learner can pick any tool (including one we don't list).

export const DEFAULT_TOOL_ID = 'gemini';

// Tools are grouped, because they are not interchangeable. A chat assistant is
// where general AI work happens; an automation platform is where AI runs inside
// a process; a specialist tool does one job (voice, evaluation).
//
// This distinction is load-bearing, not cosmetic. Every generator treats the
// FIRST of a learner's tools as the one they do hands-on work in, so without a
// category someone who picked only n8n would be told to open n8n and write a
// customer email in it. resolveTools sorts chat tools first for exactly that
// reason, and buildToolGuidance tells the model what each group is for.
export const TOOL_CATEGORIES = [
  { id: 'chat', label: 'Chat assistants', hint: 'Where most AI work happens day to day' },
  { id: 'automation', label: 'Automation', hint: 'Run AI steps inside a process that works on its own' },
  { id: 'specialist', label: 'Specialist', hint: 'One job, done well — voice, audio, evaluation' },
];

export const CATEGORY_ORDER = TOOL_CATEGORIES.map((c) => c.id);

export const AI_TOOLS = [
  {
    id: 'gemini',
    category: 'chat',
    label: 'Gemini',
    emoji: '✨',
    url: 'https://gemini.google.com/app',
    strengths: 'images and visuals, Google Workspace (Docs, Sheets, Gmail), long documents, and quick everyday help',
  },
  {
    id: 'chatgpt',
    category: 'chat',
    label: 'ChatGPT',
    emoji: '🤖',
    url: 'https://chatgpt.com/',
    strengths: 'general writing, brainstorming, step-by-step reasoning, and broad everyday tasks',
  },
  {
    id: 'claude',
    category: 'chat',
    label: 'Claude',
    emoji: '📝',
    url: 'https://claude.ai/',
    strengths: 'long documents, careful writing and editing, nuanced analysis, and following detailed instructions',
  },
  {
    id: 'copilot',
    category: 'chat',
    label: 'Microsoft Copilot',
    emoji: '🟦',
    url: 'https://copilot.microsoft.com/',
    strengths: 'Microsoft 365 work — Word, Excel, PowerPoint, Outlook, and Teams',
  },
  {
    id: 'github_copilot',
    category: 'chat',
    label: 'GitHub Copilot',
    emoji: '🐙',
    url: 'https://github.com/copilot',
    strengths: 'writing, explaining, and reviewing code inside your editor and on GitHub',
  },
  {
    id: 'n8n',
    category: 'automation',
    label: 'n8n',
    emoji: '⚙️',
    url: 'https://n8n.io/',
    strengths: 'workflow automation — connecting apps and running AI steps inside a process that works on its own',
  },
  {
    id: 'zapier',
    category: 'automation',
    label: 'Zapier',
    emoji: '⚡',
    url: 'https://zapier.com/',
    strengths: 'quick app-to-app automations with AI steps, without anything to host or maintain',
  },
  {
    id: 'make',
    category: 'automation',
    label: 'Make',
    emoji: '🧩',
    url: 'https://www.make.com/',
    strengths: 'visual multi-step automations across apps, with AI steps in the flow',
  },
  {
    id: 'vapi',
    category: 'specialist',
    label: 'Vapi',
    emoji: '📞',
    url: 'https://vapi.ai/',
    strengths: 'voice AI agents that make and take phone calls',
  },
  {
    id: 'elevenlabs',
    category: 'specialist',
    label: 'ElevenLabs',
    emoji: '🔊',
    url: 'https://elevenlabs.io/',
    strengths: 'realistic AI voice and audio generation',
  },
  {
    id: 'langsmith',
    category: 'specialist',
    label: 'LangSmith',
    emoji: '🔬',
    url: 'https://smith.langchain.com/',
    strengths: 'testing and evaluating AI output — tracing, scoring, and comparing versions',
  },
];

export function toolCategory(tool) {
  // A typed-in custom tool has no category. 'specialist' is the safe home: it
  // keeps it out of the chat-first ordering, so an unknown tool can never become
  // the one a learner is told to write their emails in.
  return tool?.category || 'specialist';
}

export function isChatTool(tool) {
  return toolCategory(tool) === 'chat';
}

const TOOL_BY_ID = new Map(AI_TOOLS.map((t) => [t.id, t]));

// A custom "Something else" tool the learner typed in. Shape stored on the
// profile: { id: 'other', label: 'Perplexity', url: 'https://...' (optional) }.
export function isCustomTool(tool) {
  return Boolean(tool && (tool.id === 'other' || (tool.id && !TOOL_BY_ID.has(tool.id))));
}

export function getTool(id) {
  return TOOL_BY_ID.get(id) || null;
}

// A stable key for de-duping and comparison (custom tools key off their label).
export function toolKey(tool) {
  if (!tool) return '';
  return tool.id === 'other' ? `other:${(tool.label || '').toLowerCase()}` : tool.id;
}

// Turn whatever is stored (an id string, a catalog object, or a typed custom
// tool) into a complete, usable tool object. Always returns something valid.
export function normalizeTool(choice) {
  if (!choice) return TOOL_BY_ID.get(DEFAULT_TOOL_ID);

  if (typeof choice === 'string') {
    return TOOL_BY_ID.get(choice) || TOOL_BY_ID.get(DEFAULT_TOOL_ID);
  }

  if (isCustomTool(choice) && choice.label) {
    const url = typeof choice.url === 'string' && choice.url.trim() ? choice.url.trim() : null;
    const strengths =
      typeof choice.strengths === 'string' && choice.strengths.trim() ? choice.strengths.trim() : null;
    // Use the AI-picked emoji when available; fall back to a neutral sparkle
    // (not a hammer) for custom tools.
    const emoji = typeof choice.emoji === 'string' && choice.emoji.trim() ? choice.emoji.trim() : '✨';
    return { id: 'other', label: choice.label, emoji, url, strengths };
  }

  return TOOL_BY_ID.get(choice.id) || TOOL_BY_ID.get(DEFAULT_TOOL_ID);
}

// Normalize a value that may be a single choice or an array into a de-duped
// array of tool objects. Returns an empty array when nothing is chosen — we do
// NOT force a default here, so the UI never pre-selects a tool the learner
// might not use.
export function normalizeTools(value) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  const out = [];
  const seen = new Set();
  for (const v of arr) {
    const t = normalizeTool(v);
    const key = toolKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

// The tools the learner has actually CHOSEN (primary first) — may be empty.
// A per-session override (array or single) wins over the saved preference.
// Supports the legacy single `preferred_tool` field. Use this for selection UI.
export function chosenTools(profile, override) {
  if (override !== undefined && override !== null) return normalizeTools(override);
  return normalizeTools(profile?.preferred_tools ?? profile?.preferred_tool);
}

// Resolve the tools for GENERATION (primary first). Same as chosenTools but
// falls back to the default tool so the coach always has something to teach
// around, even if the learner hasn't picked yet. Never returns empty.
export function resolveTools(profile, override) {
  const chosen = chosenTools(profile, override);
  if (!chosen.length) return [TOOL_BY_ID.get(DEFAULT_TOOL_ID)];
  // Chat tools first. Every generator treats tools[0] as the one the learner
  // does hands-on work in, and a learner's stored order is just the sequence
  // they happened to tick boxes in — so without this, someone whose first pick
  // was n8n gets told to write a customer email inside n8n. Their automation and
  // specialist tools are still passed through, and the model is told what each
  // group is for; this only decides which one is the DEFAULT hands-on tool.
  // Stable within a group, so their own ordering is otherwise preserved.
  const rank = (t) => (isChatTool(t) ? 0 : 1);
  return [...chosen].sort((a, b) => rank(a) - rank(b));
}

// The primary (first) tool — what single-tool surfaces (the "Open" button,
// "keep X open") use by default.
export function resolveTool(profile, override) {
  return resolveTools(profile, override)[0];
}

// Serialize a set of tool objects into the compact form stored on the profile.
export function serializeTools(tools) {
  return normalizeTools(tools).map((t) =>
    t.id === 'other'
      ? { id: 'other', label: t.label, url: t.url || null, strengths: t.strengths || null, emoji: t.emoji || null }
      : t.id
  );
}

// The shared instruction block injected into every learner-facing generator so
// the coach teaches people to do the work in THEIR tool(s), names tools freely,
// and recommends the best-suited tool per task. Accepts a single tool or an
// array; the first tool is treated as primary. `catalog` is the live (merged)
// tool catalog — pass it so admin-updated "what it's good for" descriptions flow
// into the coach's recommendations; it defaults to the static catalog.
// `lineupText` (optional) is the current model-lineup block from
// formatLineupForPrompt() — appended so the coach recommends the model TIER
// (fast vs. deep-reasoning) that fits the task, using current model names.
export function buildToolGuidance(toolsOrTool, catalog = AI_TOOLS, lineupText = '') {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  // Overlay live strengths/labels from the catalog onto the learner's tools.
  let tools = normalizeTools(toolsOrTool).map((t) => {
    const c = byId.get(t.id);
    return c ? { ...t, label: c.label, strengths: c.strengths } : t;
  });
  if (!tools.length) tools = [byId.get(DEFAULT_TOOL_ID) || TOOL_BY_ID.get(DEFAULT_TOOL_ID)]; // generation safety net
  const primary = tools[0];
  const theirKeys = new Set(tools.map(toolKey));
  // Only CHAT tools are offered as "a tool you don't have would suit this
  // better". Suggesting a chat assistant they're missing is useful; suggesting
  // an eval or voice tool for writing an email is nonsense, and with the
  // catalog now holding automation and specialist entries that is exactly what
  // an unfiltered list invites.
  const others = catalog.filter((x) => !theirKeys.has(toolKey(x)) && isChatTool(x))
    .map((x) => `${x.label} (best for ${x.strengths})`)
    .join('; ');

  if (tools.length === 1) {
    return [
      `THE LEARNER'S AI TOOL: ${primary.label}.`,
      // One non-chat tool and nothing else: teach inside it rather than pretending
      // it is a chat assistant, and keep the lesson to what it actually does.
      !isChatTool(primary)
        ? `- ${primary.label} is ${toolCategory(primary) === 'automation' ? 'an AUTOMATION platform' : 'a SPECIALIST tool'}, not a chat assistant (${primary.strengths || 'a specific job'}). Teach the AI part of using it — the AI step in the workflow, the prompt behind the agent, what an eval is measuring. Do NOT frame it as somewhere to draft writing or hold a back-and-forth conversation, because that is not what it is.`
        : null,
      `- The learner does the actual AI work in ${primary.label}, kept open in a SEPARATE window beside this coach. Your job is to teach them how to do it THERE — coach them through it, do not do the work for them here.`,
      // Conversation framing only makes sense for a chat assistant. Telling
      // someone to "start a chat and iterate on the reply" in n8n or Vapi
      // describes an interface that isn't there.
      isChatTool(primary)
        ? `- Frame using ${primary.label} as a CONVERSATION, not a one-shot. Tell them to start a chat, paste or attach the relevant file/notes, then go back and forth — ask follow-ups and refine the output together. AVOID robotic phrasing like "open ${primary.label} and type this in"; coach the real interaction (start a chat, attach a doc, iterate on the reply).`
        : `- Coach them through ${primary.label}'s own interface as it actually works — building and running the thing, then checking the output and adjusting. Do not describe it as a chat window.`,
      `- Give prompts they can copy and paste straight into ${primary.label}, and reference ${primary.label}'s real interface (where to type, how to attach a file or image, etc.) when it helps.`,
      `- You may MENTION other tools by name (ChatGPT, Claude, Gemini, Copilot) when explaining or comparing — but any instruction that tells the learner to actually open/use a tool to do hands-on work MUST say "${primary.label}", never a different tool name. The UI always opens ${primary.label} for them, so instructions naming a different tool would contradict what's on screen.`,
      `- RECOMMEND THE BEST TOOL FOR THE TASK: if a different tool is clearly better for this specific task, say so in one short line and explain why — but still have them do the hands-on step in ${primary.label}. For reference — ${others}.`,
      lineupText,
    ].filter(Boolean).join('\n');
  }

  const list = tools.map((t) => t.label).join(', ');

  // Spell out the non-chat tools and what they are FOR. Without this the model
  // sees a flat list of names and will happily send someone to n8n to draft an
  // email — the tools are not interchangeable, and only the catalog knows that.
  const nonChat = tools.filter((t) => !isChatTool(t));
  const chatOnly = tools.filter(isChatTool);
  const categoryNote = nonChat.length
    ? [
      `- NOT ALL OF THEIR TOOLS ARE CHAT ASSISTANTS. ${nonChat.map((t) => `${t.label} is ${toolCategory(t) === 'automation' ? 'an AUTOMATION platform' : 'a SPECIALIST tool'} (${t.strengths || 'a specific job'})`).join('; ')}.`,
      chatOnly.length
        ? `- Default the hands-on step to one of their chat assistants (${chatOnly.map((t) => t.label).join(', ')}). Send them to ${nonChat.map((t) => t.label).join(' or ')} ONLY when the topic is genuinely about that tool's job — building or changing an automation, working with voice, evaluating output. Never for general writing, analysis or everyday prompting.`
        : `- They have no chat assistant selected, so teach inside ${nonChat[0].label} itself and keep the work to what that tool actually does.`,
      `- When the topic IS about ${nonChat.map((t) => t.label).join(' / ')}, teach the AI part of it — the AI step inside the workflow, the prompt behind the voice agent, what you are measuring in an eval — not the plumbing.`,
    ].join('\n')
    : null;

  return [
    `THE LEARNER'S AI TOOLS: ${list}.`,
    categoryNote,
    `- The learner does the actual AI work in their own tools, kept open in a SEPARATE window beside this coach. Teach them how to do it THERE — coach them through it, do not do the work for them here.`,
    `- Frame using the tool as a CONVERSATION, not a one-shot. Tell them to start a chat, paste or attach the relevant file/notes, then go back and forth — ask follow-ups and refine together. AVOID robotic phrasing like "open it and type this in"; coach the real interaction (start a chat, attach a doc, iterate on the reply).`,
    `- They have access to: ${list}. For each task, pick the BEST tool from their set for THIS specific task and explain why in one short line. When several fit equally well, just pick one of theirs — the learner has no "default", so don't ask them to choose.`,
    `- Give prompts they can copy and paste straight into whichever tool you recommend, and reference that tool's real interface when it helps.`,
    `- Whichever of their tools you pick for a hands-on step, the instructions must name THAT exact tool consistently — never switch to a different tool name mid-activity, since the UI's "open" button will only open the one tool you picked. If a tool OUTSIDE their set is clearly better for a specific task, you may mention it briefly and why, but still direct the hands-on step to one of their own tools. For reference — ${others}.`,
    lineupText,
  ].filter(Boolean).join('\n');
}
