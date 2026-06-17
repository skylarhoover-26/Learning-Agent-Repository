import { getUserData, saveUserData } from './blob-store';
import { AI_TOOLS } from './ai-tools';

// App-wide overrides for the AI tool catalog, stored as a single system blob.
// Only the edited fields are persisted; anything not overridden falls back to the
// code defaults in ai-tools.js. This is what makes "what each tool is good for"
// updatable when the AI landscape shifts — an admin (optionally with AI
// suggestions) edits the catalog here, and every surface reflects it.
// Mirrors the skill-levels / notify-allowlist pattern.
const SYSTEM_ID = '__system__';
const TYPE = 'ai_tools';

// Fields an admin may override per tool. `id` and `emoji` stay code-owned.
export const EDITABLE_FIELDS = ['label', 'strengths', 'url'];

export async function getToolOverrides() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  return data && typeof data.tools === 'object' && data.tools ? data.tools : {};
}

// Apply overrides onto the code defaults — the authoritative catalog.
export function mergeTools(overrides) {
  return AI_TOOLS.map((t) => {
    const o = overrides && overrides[t.id];
    if (!o) return t;
    const merged = { ...t };
    for (const f of EDITABLE_FIELDS) {
      if (typeof o[f] === 'string' && o[f].trim()) merged[f] = o[f].trim();
    }
    return merged;
  });
}

export async function getMergedTools() {
  return mergeTools(await getToolOverrides());
}

// Persist overrides. Ignores unknown tool ids and drops any value that matches
// the code default, so the override blob stays minimal.
export async function setToolOverrides(tools) {
  const byId = new Map(AI_TOOLS.map((t) => [t.id, t]));
  const clean = {};
  for (const [id, fields] of Object.entries(tools || {})) {
    const base = byId.get(id);
    if (!base || !fields || typeof fields !== 'object') continue;
    const entry = {};
    for (const f of EDITABLE_FIELDS) {
      const v = typeof fields[f] === 'string' ? fields[f].trim() : '';
      if (v && v !== base[f]) entry[f] = v;
    }
    if (Object.keys(entry).length) clean[id] = entry;
  }
  await saveUserData(SYSTEM_ID, TYPE, { tools: clean, updated_at: new Date().toISOString() });
  return clean;
}
