// Single source of truth for the external AI tools learners use alongside the
// coach. The whole platform now teaches people to do the actual work in THEIR
// own AI tool (kept open in a separate window) — this module holds the catalog,
// the preference helpers, and the prompt guidance injected into every generator.
//
// We default to Gemini because everyone at the company has it through Google
// Workspace, but a learner can pick any tool (including one we don't list).

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

// Turn whatever is stored (an id string, a catalog object, or a typed custom
// tool) into a complete, usable tool object. Always returns something valid.
export function normalizeTool(choice) {
  if (!choice) return TOOL_BY_ID.get(DEFAULT_TOOL_ID);

  if (typeof choice === 'string') {
    return TOOL_BY_ID.get(choice) || TOOL_BY_ID.get(DEFAULT_TOOL_ID);
  }

  if (isCustomTool(choice) && choice.label) {
    const url = typeof choice.url === 'string' && choice.url.trim() ? choice.url.trim() : null;
    return { id: 'other', label: choice.label, emoji: '🛠️', url, strengths: null };
  }

  return TOOL_BY_ID.get(choice.id) || TOOL_BY_ID.get(DEFAULT_TOOL_ID);
}

// Resolve the tool to use for a generation: a per-lesson override wins over the
// learner's saved preference, which falls back to the default.
export function resolveTool(profile, override) {
  return normalizeTool(override || profile?.preferred_tool);
}

// The shared instruction block injected into every learner-facing generator so
// the coach teaches people to do the work in THEIR tool, names tools freely,
// and recommends a better-suited tool per task when one clearly exists.
export function buildToolGuidance(tool) {
  const t = normalizeTool(tool);
  const others = AI_TOOLS.filter((x) => x.id !== t.id)
    .map((x) => `${x.label} (best for ${x.strengths})`)
    .join('; ');

  return [
    `THE LEARNER'S AI TOOL: ${t.label}.`,
    `- The learner does the actual AI work in ${t.label}, kept open in a SEPARATE window beside this coach. Your job is to teach them how to do it THERE — coach them through it, do not do the work for them here.`,
    `- Give prompts they can copy and paste straight into ${t.label}, and reference ${t.label}'s real interface (where to type, how to attach a file or image, etc.) when it helps.`,
    `- You may name AI tools freely (${t.label}, ChatGPT, Claude, Gemini, Copilot) — naming the tool is encouraged, not forbidden.`,
    `- RECOMMEND THE BEST TOOL FOR THE TASK: default to ${t.label}, but if a different tool is clearly better for this specific task, say so in one short line and explain why, then continue. For reference — ${others}.`,
  ].join('\n');
}
