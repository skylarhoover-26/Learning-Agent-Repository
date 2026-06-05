'use client';

import { saveToBlob } from './sync-store';

const GAME_STATE_KEY = 'learner_game_state';

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
