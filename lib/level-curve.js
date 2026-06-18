// Pure level-curve math — NO browser/storage dependencies, so it is safe to
// import from both client code (progression.js) and server code (data.js).
// This is the single source of truth for how XP maps to levels.
//
// Infinite, accelerating curve: levels ramp linearly through RAMP_LEVEL, then
// switch to geometric growth so level 30+ becomes a real grind. The constants
// are tuned to feel good and are safe to adjust.

const RAMP_LEVEL = 30;
const BASE_STEP = 100;   // cost of level 1 -> 2
const LINEAR_STEP = 40;  // added per level through RAMP_LEVEL
const GROWTH = 1.12;     // geometric growth factor beyond RAMP_LEVEL

// Cost (in XP) to advance from `level` to `level + 1`.
export function xpForNextLevel(level) {
  const lvl = Math.max(1, level);
  if (lvl < RAMP_LEVEL) {
    return Math.round(BASE_STEP + LINEAR_STEP * (lvl - 1));
  }
  const rampCost = BASE_STEP + LINEAR_STEP * (RAMP_LEVEL - 1);
  return Math.round(rampCost * Math.pow(GROWTH, lvl - RAMP_LEVEL));
}

// Returns level + progress-bar fields for a given total XP.
export function getLevelProgress(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let floorXp = 0;
  let cost = xpForNextLevel(level);
  while (floorXp + cost <= xp && level < 9999) {
    floorXp += cost;
    level += 1;
    cost = xpForNextLevel(level);
  }
  const xpIntoLevel = xp - floorXp;
  const nextThreshold = floorXp + cost;
  return {
    level,
    totalXp: xp,
    currentThreshold: floorXp,
    nextThreshold,
    xpIntoLevel,
    xpForLevel: cost,
    percent: Math.min(100, Math.round((xpIntoLevel / cost) * 100)),
    xpToNext: Math.max(0, nextThreshold - xp),
  };
}

export function getLevel(totalXp) {
  return getLevelProgress(totalXp).level;
}
