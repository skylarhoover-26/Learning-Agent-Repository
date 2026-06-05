'use client';

import { calculateSm2, getDefaultCardState } from './sm2';
import { REVIEW_CARDS } from './review-data';
import { saveToBlob } from './sync-store';

const REVIEW_STATE_KEY = 'learner_review_state';
const REVIEW_STATS_KEY = 'learner_review_stats';

function getAllCardStates() {
  try {
    const raw = localStorage.getItem(REVIEW_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllCardStates(states) {
  try {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(states));
    saveToBlob(REVIEW_STATE_KEY, states);
  } catch {
    // localStorage not available
  }
}

export function getCardState(cardId) {
  const all = getAllCardStates();
  return all[cardId] || getDefaultCardState();
}

export function updateCardAfterReview(cardId, quality) {
  const all = getAllCardStates();
  const current = all[cardId] || getDefaultCardState();

  const result = calculateSm2(
    quality,
    current.repetitions,
    current.easeFactor,
    current.interval
  );

  const updated = {
    ...result,
    reviewCount: (current.reviewCount || 0) + 1,
    correctCount: (current.correctCount || 0) + (quality >= 3 ? 1 : 0),
    lastReviewedAt: new Date().toISOString(),
  };

  all[cardId] = updated;
  saveAllCardStates(all);

  addReviewToStats(quality >= 3);

  return updated;
}

export function getDueCards() {
  const now = new Date().toISOString();
  const allStates = getAllCardStates();

  return REVIEW_CARDS.filter(card => {
    const state = allStates[card.id];
    if (!state) return true;
    return state.nextReviewAt <= now;
  });
}

export function getNewCards(limit = 5) {
  const allStates = getAllCardStates();
  return REVIEW_CARDS
    .filter(card => !allStates[card.id])
    .slice(0, limit);
}

export function buildReviewQueue(maxCards = 10) {
  const due = getDueCards();
  const newCards = getNewCards(maxCards - due.length);

  const queue = [...due];
  for (const card of newCards) {
    if (queue.length >= maxCards) break;
    if (!queue.find(c => c.id === card.id)) {
      queue.push(card);
    }
  }

  return queue.slice(0, maxCards);
}

function addReviewToStats(correct) {
  try {
    const raw = localStorage.getItem(REVIEW_STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { totalReviews: 0, totalCorrect: 0, sessions: [] };
    stats.totalReviews += 1;
    if (correct) stats.totalCorrect += 1;
    localStorage.setItem(REVIEW_STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage not available
  }
}

export function getReviewStats() {
  try {
    const raw = localStorage.getItem(REVIEW_STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { totalReviews: 0, totalCorrect: 0 };
    const allStates = getAllCardStates();
    const reviewedCount = Object.keys(allStates).length;
    const masteredCount = Object.values(allStates).filter(s => s.interval >= 21).length;

    return {
      ...stats,
      totalCards: REVIEW_CARDS.length,
      reviewedCards: reviewedCount,
      masteredCards: masteredCount,
      accuracy: stats.totalReviews > 0
        ? Math.round((stats.totalCorrect / stats.totalReviews) * 100)
        : 0,
    };
  } catch {
    return { totalReviews: 0, totalCorrect: 0, totalCards: REVIEW_CARDS.length, reviewedCards: 0, masteredCards: 0, accuracy: 0 };
  }
}
