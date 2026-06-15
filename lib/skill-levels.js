import { getUserData, saveUserData } from './blob-store';
import { getSkillLevelDefaults } from './heatmap-data';

// App-wide skill → level overrides, stored as a single system blob. Only the
// overrides are persisted; anything not overridden falls back to the code
// defaults in heatmap-data. Mirrors the notify-allowlist pattern.
const SYSTEM_ID = '__system__';
const TYPE = 'skill_levels';

export const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

export async function getSkillLevelOverrides() {
  const data = await getUserData(SYSTEM_ID, TYPE);
  return data && typeof data.levels === 'object' && data.levels ? data.levels : {};
}

// Defaults merged with admin overrides — the authoritative level for each skill.
export async function getMergedSkillLevels() {
  const defaults = getSkillLevelDefaults();
  const overrides = await getSkillLevelOverrides();
  return { ...defaults, ...overrides };
}

// Persist overrides. Ignores unknown skill names and invalid levels, and drops
// entries that match the default so the override blob stays minimal.
export async function setSkillLevels(levels) {
  const defaults = getSkillLevelDefaults();
  const clean = {};
  for (const [name, level] of Object.entries(levels || {})) {
    if (name in defaults && VALID_LEVELS.includes(level) && level !== defaults[name]) {
      clean[name] = level;
    }
  }
  await saveUserData(SYSTEM_ID, TYPE, { levels: clean, updated_at: new Date().toISOString() });
  return clean;
}
