'use client';

const XP_KEY = 'learner_xp_log';
const BADGES_KEY = 'learner_earned_badges';

export function addXp(amount, source) {
  try {
    const log = getXpLog();
    log.push({ amount, source, timestamp: new Date().toISOString() });
    localStorage.setItem(XP_KEY, JSON.stringify(log));
    return getTotalEarnedXp();
  } catch {
    return 0;
  }
}

export function getXpLog() {
  try {
    const raw = localStorage.getItem(XP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getTotalEarnedXp() {
  return getXpLog().reduce((sum, entry) => sum + (entry.amount || 0), 0);
}

export function earnBadge(badgeId) {
  try {
    const badges = getEarnedBadgeIds();
    if (!badges.includes(badgeId)) {
      badges.push(badgeId);
      localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
    }
    return badges;
  } catch {
    return [];
  }
}

export function getEarnedBadgeIds() {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
