'use client';

import { saveToBlob } from './sync-store';
import { onGameComplete } from './progression';
import { emitXp } from './xp-bus';
import { resolveLearnerId } from './learner-id';

const GAME_STATE_KEY = 'learner_game_state';

// Resolve the learner id outside React, from the cached profile, so game XP can
// be awarded centrally here (every game calls saveGameResult on finish).
function cachedLearnerId() {
  try {
    const raw = localStorage.getItem('learner_profile');
    return raw ? resolveLearnerId(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function getAllState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    return raw ? JSON.parse(raw) : { stats: {}, history: [], inProgress: {} };
  } catch {
    return { stats: {}, history: [], inProgress: {} };
  }
}

function saveAllState(state) {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    saveToBlob(GAME_STATE_KEY, state);
  } catch {
    // localStorage not available
  }
}

export function getGameStats(slug) {
  const all = getAllState();
  return all.stats[slug] || { gamesPlayed: 0, bestScore: 0, lastPlayedAt: null };
}

export function getGameHistory(slug, limit = 10) {
  const all = getAllState();
  return all.history
    .filter(h => h.game === slug)
    .slice(-limit);
}

export function saveGameResult(slug, result) {
  const all = getAllState();
  if (!all.stats[slug]) {
    all.stats[slug] = { gamesPlayed: 0, bestScore: 0, lastPlayedAt: null };
  }
  all.stats[slug].gamesPlayed += 1;
  all.stats[slug].lastPlayedAt = new Date().toISOString();
  if (result.score !== undefined && result.score > all.stats[slug].bestScore) {
    all.stats[slug].bestScore = result.score;
  }
  all.history.push({ game: slug, ...result, completedAt: new Date().toISOString() });
  saveAllState(all);

  // Award game XP through a single path. XP is the game's difficulty base
  // scaled by how well they did (score / total), and it only pays out the first
  // time each game is finished per content-day (see onGameComplete). Total games
  // played (across all games) drives the game badges.
  const learnerId = cachedLearnerId();
  if (learnerId) {
    const totalGames = Object.values(all.stats).reduce(
      (sum, st) => sum + (st.gamesPlayed || 0), 0
    );
    const fraction = (result.total && result.total > 0)
      ? Math.max(0, Math.min(1, result.score / result.total))
      : 1;
    const xpResult = onGameComplete(learnerId, slug, { fraction, gamesPlayed: totalGames });
    emitXp(xpResult);
    return xpResult;
  }
  return null;
}

export function getInProgress(slug) {
  const all = getAllState();
  return all.inProgress[slug] || null;
}

export function saveInProgress(slug, state) {
  const all = getAllState();
  all.inProgress[slug] = { ...state, savedAt: new Date().toISOString() };
  saveAllState(all);
}

export function clearInProgress(slug) {
  const all = getAllState();
  delete all.inProgress[slug];
  saveAllState(all);
}
