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

// How well the player did, 0–1, for scaling the XP award.
//
// `score / total` only works when both are in the same unit. Family Feud scores
// survey points against a round count (109 points / 4 rounds clamped to a perfect
// 1.0) and Wheel of Fortune scores dollars against a puzzle count — so those games
// pass an explicit `fraction` instead of leaving it to be inferred. Games whose
// score and total genuinely match keep using the ratio.
function resultFraction(result) {
  if (typeof result.fraction === 'number' && Number.isFinite(result.fraction)) {
    return Math.max(0, Math.min(1, result.fraction));
  }
  if (result.total && result.total > 0) {
    return Math.max(0, Math.min(1, result.score / result.total));
  }
  return 1;
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

  // Every finished game pays out, however the round was built, and every time it
  // is played. Custom rounds used to be practice-only, which quietly meant Family
  // Feud, Jeopardy, Millionaire, Two Truths and Wheel of Fortune could NEVER award
  // XP — a generated round is the only way to play them. Two rounds that look
  // identical to the player score identically.
  //
  // Games carry no daily cap: a second win is a second award. Only chat and quick
  // tips are limited (DAILY_CAPS in lib/progression). What keeps replays honest is
  // that the award scales with score, so a throwaway run pays close to nothing.
  //
  // XP is the game's difficulty base scaled by how well they did, and total games
  // played (across all games) drives the game badges.
  const learnerId = cachedLearnerId();
  if (learnerId) {
    const totalGames = Object.values(all.stats).reduce(
      (sum, st) => sum + (st.gamesPlayed || 0), 0
    );
    const xpResult = onGameComplete(learnerId, slug, { fraction: resultFraction(result), gamesPlayed: totalGames });
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
