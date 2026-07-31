import { getUserData, saveUserData } from './blob-store';

// The "current AI model lineup" reference — a single source of truth for WHICH
// model is the fast / balanced / deep-reasoning tier inside each AI tool people
// use. It is refreshed automatically by /api/model-lineup/refresh (a daily cron
// that web-searches the current lineup) and read by the lesson/chat generators so
// the coach recommends *current* models instead of names hardcoded in prose.
//
// The split that keeps this from going stale:
//   - GENERAL_GUIDANCE  = the durable skill (match tier to task). Rarely changes.
//   - tools[].{fast,balanced,reasoning} = the perishable model NAMES. Refreshed.
//
// Stored as one system blob, mirroring the ai-tools / skill-levels pattern.

const SYSTEM_ID = '__system__';
const TYPE = 'model_lineup';

// Tool-agnostic and durable — this is the part lessons teach as a skill, and it
// stays true no matter how the model names churn.
export const GENERAL_GUIDANCE =
  'Most AI tools now offer more than one model: a fast, default model for quick, ' +
  'simple, high-volume work, and a slower "deep-reasoning" model for complex, ' +
  'multi-step, or high-stakes tasks. Match the model to the task — don\'t burn the ' +
  'slow reasoning model on trivial asks, and don\'t ship high-stakes work from the quick one.';

// Seed lineup (source: 'seed'). Tier-focused and deliberately light on exact
// version numbers; the daily refresh overwrites it with web-searched current
// facts. If the blob is ever empty or malformed, this is the safety net so the
// coach still has something reasonable to say.
export const FALLBACK_LINEUP = {
  updated_at: null,
  source: 'seed',
  general_guidance: GENERAL_GUIDANCE,
  tools: [
    { id: 'claude', label: 'Claude', fast: 'Haiku', balanced: 'Sonnet', reasoning: 'Opus', note: 'Haiku for quick tasks, Sonnet for everyday work, Opus for the hardest reasoning.' },
    { id: 'chatgpt', label: 'ChatGPT', fast: 'the default model', balanced: null, reasoning: 'the "reasoning"/thinking model', note: 'Switch to the reasoning model for hard, multi-step problems; the default is fine for everyday chat.' },
    { id: 'gemini', label: 'Gemini', fast: 'Flash', balanced: null, reasoning: 'Pro', note: 'Flash for speed and volume, Pro for deeper reasoning.' },
    { id: 'copilot', label: 'Microsoft Copilot', fast: null, balanced: null, reasoning: null, note: 'Runs on frontier models under the hood; choose a deeper-reasoning mode when offered for complex work.' },
    { id: 'github_copilot', label: 'GitHub Copilot', fast: null, balanced: null, reasoning: null, note: 'Lets you pick the underlying model; choose a stronger reasoning model for complex refactors or architecture.' },
  ],
};

function strOrNull(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

// Guard against a malformed AI/admin payload corrupting what lessons teach.
// Returns a normalized lineup, or null if the shape is unusable.
export function validateLineup(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.tools)) return null;
  const tools = raw.tools
    .filter((t) => t && typeof t.id === 'string' && typeof t.label === 'string')
    .map((t) => ({
      id: t.id.trim(),
      label: t.label.trim(),
      fast: strOrNull(t.fast),
      balanced: strOrNull(t.balanced),
      reasoning: strOrNull(t.reasoning),
      note: strOrNull(t.note),
    }));
  if (!tools.length) return null;
  return {
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    source: typeof raw.source === 'string' ? raw.source : 'ai',
    general_guidance: strOrNull(raw.general_guidance) || GENERAL_GUIDANCE,
    tools,
  };
}

// The current live lineup, or the seed fallback if nothing valid is stored yet.
export async function getModelLineup() {
  try {
    const data = await getUserData(SYSTEM_ID, TYPE);
    const valid = validateLineup(data);
    if (valid) return valid;
  } catch (error) {
    console.error('getModelLineup read error:', error);
  }
  return FALLBACK_LINEUP;
}

// Persist a refreshed lineup. Validates first so a bad payload can never go live.
export async function saveModelLineup(lineup) {
  const clean = validateLineup(lineup);
  if (!clean) throw new Error('Invalid model lineup shape');
  await saveUserData(SYSTEM_ID, TYPE, clean);
  return clean;
}

// Confirm a suggested model actually belongs to a given tool, per the live
// lineup. Returns the lineup's OWN spelling (normalizing casing/shorthand from
// the model) or '' if it doesn't check out.
//
// This is the guard that keeps an automatic model recommendation honest: telling
// a learner to switch to a model their tool doesn't have — or one that belongs to
// a different tool entirely — is worse than saying nothing at all.
export function validateModelForTool(lineup, toolLabel, suggested) {
  const want = String(suggested || '').trim();
  if (!want || !lineup?.tools?.length) return '';
  const row = lineup.tools.find(
    (t) => (t.label || '').toLowerCase() === String(toolLabel || '').toLowerCase(),
  );
  if (!row) return '';
  const tiers = [row.fast, row.balanced, row.reasoning].filter(Boolean);
  const exact = tiers.find((m) => m.toLowerCase() === want.toLowerCase());
  if (exact) return exact;
  // Accept a longer form that contains a tier name ("Claude Opus 4.5" for a
  // lineup entry of "Opus"), but return the lineup's spelling so the on-screen
  // hint and the lesson prose use one wording.
  const loose = tiers.find(
    (m) => want.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(want.toLowerCase()),
  );
  return loose || '';
}

// Feedback #53: naming the lineup wasn't enough — lessons hedged ("use a
// reasoning model") instead of telling the learner which model to pick for the
// task in front of them. These rules make the pick concrete, keep the "why" to
// one line so it doesn't derail the lesson, and hold the how-to-switch
// explanation in reserve for learners who ask.
function pickAModelRules({ hasNamedModels }) {
  return [
    'PICKING A MODEL FOR THIS TASK:',
    hasNamedModels
      ? '- Name ONE specific model from the list above for the hands-on work in this lesson — the one actually best suited to this task. Do not hedge with "a reasoning model" or "your tool\'s best model" when you can name it.'
      : '- We do not have a current model list for this learner\'s tool, so do NOT guess model names. Tell them which TIER to pick (the quick default vs. the deeper reasoning model) and where that choice lives in their tool.',
    '- Give the reason in ONE short sentence, tied to this task ("this one is worth the extra wait because the draft has to hold up in front of a customer"). Do not lecture about model tiers unless the lesson is about model choice.',
    '- If the task genuinely does not need the deeper model, say so and name the fast one — recommending the slow model for everything is its own mistake.',
    '- If the learner ASKS why that model, or how to change models, explain it then: where the model picker lives in their tool, and what they would switch to for a lighter or heavier task. Do not volunteer those switching steps unasked.',
  ];
}

// Compact, prompt-injectable description of the CURRENT lineup, scoped to the
// learner's own tool ids when given so we don't dump the whole matrix into a
// prompt. Returns '' when there's nothing relevant to say.
export function formatLineupForPrompt(lineup, toolIds = null) {
  if (!lineup || !Array.isArray(lineup.tools)) return '';
  const wanted = Array.isArray(toolIds) && toolIds.length ? new Set(toolIds) : null;
  const rows = lineup.tools
    .filter((t) => !wanted || wanted.has(t.id))
    .map((t) => {
      const tiers = [
        t.fast ? `fast: ${t.fast}` : null,
        t.balanced ? `balanced: ${t.balanced}` : null,
        t.reasoning ? `deep reasoning: ${t.reasoning}` : null,
      ].filter(Boolean).join(', ');
      const detail = [tiers, t.note].filter(Boolean).join('. ');
      return `- ${t.label}${detail ? ` — ${detail}` : ''}`;
    });
  if (!rows.length) {
    // The learner's tool isn't in our lineup (e.g. a custom "other" tool). Still
    // teach the durable tier-matching skill, just without tool-specific names.
    return wanted
      ? [
        `MODEL TIERS: ${lineup.general_guidance || GENERAL_GUIDANCE}`,
        ...pickAModelRules({ hasNamedModels: false }),
      ].join('\n')
      : '';
  }
  return [
    'CURRENT AI MODEL LINEUP (kept up to date — every model you name must come from this list):',
    lineup.general_guidance || GENERAL_GUIDANCE,
    ...rows,
    ...pickAModelRules({ hasNamedModels: true }),
  ].join('\n');
}
