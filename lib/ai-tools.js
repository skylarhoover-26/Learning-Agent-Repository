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

export const AI_TOOLS = [
  {
    id: 'gemini',
    label: 'Gemini',
    emoji: '✨',
    url: 'https://gemini.google.com/app',
    strengths: 'images and visuals, Google Workspace (Docs, Sheets, Gmail), long documents, and quick everyday help',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    emoji: '🤖',
    url: 'https://chatgpt.com/',
    strengths: 'general writing, brainstorming, step-by-step reasoning, and broad everyday tasks',
  },
  {
    id: 'claude',
    label: 'Claude',
    emoji: '📝',
    url: 'https://claude.ai/',
    strengths: 'long documents, careful writing and editing, nuanced analysis, and following detailed instructions',
  },
  {
    id: 'copilot',
    label: 'Microsoft Copilot',
    emoji: '🟦',
    url: 'https://copilot.microsoft.com/',
    strengths: 'Microsoft 365 work — Word, Excel, PowerPoint, Outlook, and Teams',
  },
  {
    id: 'github_copilot',
    label: 'GitHub Copilot',
    emoji: '🐙',
    url: 'https://github.com/copilot',
    strengths: 'writing, explaining, and reviewing code inside your editor and on GitHub',
  },
];

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
  return chosen.length ? chosen : [TOOL_BY_ID.get(DEFAULT_TOOL_ID)];
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
export function buildToolGuidance(toolsOrTool, catalog = AI_TOOLS) {
  const byId = new Map(catalog.map((t) => [t.id, t]));
  // Overlay live strengths/labels from the catalog onto the learner's tools.
  let tools = normalizeTools(toolsOrTool).map((t) => {
    const c = byId.get(t.id);
    return c ? { ...t, label: c.label, strengths: c.strengths } : t;
  });
  if (!tools.length) tools = [byId.get(DEFAULT_TOOL_ID) || TOOL_BY_ID.get(DEFAULT_TOOL_ID)]; // generation safety net
  const primary = tools[0];
  const theirKeys = new Set(tools.map(toolKey));
  const others = catalog.filter((x) => !theirKeys.has(toolKey(x)))
    .map((x) => `${x.label} (best for ${x.strengths})`)
    .join('; ');

  if (tools.length === 1) {
    return [
      `THE LEARNER'S AI TOOL: ${primary.label}.`,
      `- The learner does the actual AI work in ${primary.label}, kept open in a SEPARATE window beside this coach. Your job is to teach them how to do it THERE — coach them through it, do not do the work for them here.`,
      `- Frame using ${primary.label} as a CONVERSATION, not a one-shot. Tell them to start a chat, paste or attach the relevant file/notes, then go back and forth — ask follow-ups and refine the output together. AVOID robotic phrasing like "open ${primary.label} and type this in"; coach the real interaction (start a chat, attach a doc, iterate on the reply).`,
      `- Give prompts they can copy and paste straight into ${primary.label}, and reference ${primary.label}'s real interface (where to type, how to attach a file or image, etc.) when it helps.`,
      `- You may MENTION other tools by name (ChatGPT, Claude, Gemini, Copilot) when explaining or comparing — but any instruction that tells the learner to actually open/use a tool to do hands-on work MUST say "${primary.label}", never a different tool name. The UI always opens ${primary.label} for them, so instructions naming a different tool would contradict what's on screen.`,
      `- RECOMMEND THE BEST TOOL FOR THE TASK: if a different tool is clearly better for this specific task, say so in one short line and explain why — but still have them do the hands-on step in ${primary.label}. For reference — ${others}.`,
    ].join('\n');
  }

  const list = tools.map((t) => t.label).join(', ');
  return [
    `THE LEARNER'S AI TOOLS: ${list}.`,
    `- The learner does the actual AI work in their own tools, kept open in a SEPARATE window beside this coach. Teach them how to do it THERE — coach them through it, do not do the work for them here.`,
    `- Frame using the tool as a CONVERSATION, not a one-shot. Tell them to start a chat, paste or attach the relevant file/notes, then go back and forth — ask follow-ups and refine together. AVOID robotic phrasing like "open it and type this in"; coach the real interaction (start a chat, attach a doc, iterate on the reply).`,
    `- They have access to: ${list}. For each task, pick the BEST tool from their set for THIS specific task and explain why in one short line. When several fit equally well, just pick one of theirs — the learner has no "default", so don't ask them to choose.`,
    `- Give prompts they can copy and paste straight into whichever tool you recommend, and reference that tool's real interface when it helps.`,
    `- Whichever of their tools you pick for a hands-on step, the instructions must name THAT exact tool consistently — never switch to a different tool name mid-activity, since the UI's "open" button will only open the one tool you picked. If a tool OUTSIDE their set is clearly better for a specific task, you may mention it briefly and why, but still direct the hands-on step to one of their own tools. For reference — ${others}.`,
  ].join('\n');
}
