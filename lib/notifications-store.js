'use client';

import { saveToBlob } from './sync-store';
import { badgeMeta } from './badges';
import { getLevelTitle } from './level-titles';

// A browser-stored, chronological log of activity notifications — XP earned,
// badges/achievements, level-ups, and streak milestones — so the header bell can
// show "everything you're getting notified about," not just unfinished lessons.
// Capped so storage can't bloat. Unread is tracked by a single "last read" stamp.
const KEY = 'lp_notifications';
const READ_KEY = 'lp_notifications_read_at';
const CAP = 40;

function read() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    saveToBlob(KEY, list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    }
  } catch {
    // localStorage unavailable — best-effort
  }
}

// Newest first.
export function listNotifications() {
  return read().sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
}

// Append a notification. Silently drops an exact duplicate of the most recent
// entry within a few seconds, which guards against double-emits (re-renders,
// React strict-mode double effects).
export function addNotification({ type, title, detail = '', emoji = '', href = '' }) {
  if (!title || typeof window === 'undefined') return;
  const ts = new Date().toISOString();
  const list = read();
  const last = list[0];
  if (
    last && last.type === type && last.title === title && last.detail === detail &&
    Date.now() - Date.parse(last.ts || 0) < 3000
  ) {
    return;
  }
  const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  write([{ id, type, title, detail, emoji, href, ts }, ...list].slice(0, CAP));
}

// Mark everything currently in the log as seen (called when the bell opens).
export function markNotificationsRead() {
  try {
    localStorage.setItem(READ_KEY, new Date().toISOString());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    }
  } catch {
    // best-effort
  }
}

// How many notifications arrived since the bell was last opened.
export function unreadNotificationCount() {
  try {
    const readAt = localStorage.getItem(READ_KEY) || '';
    return read().filter((n) => String(n.ts || '') > readAt).length;
  } catch {
    return 0;
  }
}

// Turn one XP-bus result into its constituent notifications. One award can yield
// several entries (XP + a level-up + a badge), each shown separately in the feed.
// Streak bonuses only fire at >=2 days (matching the XP toast).
export function recordXpNotifications(result) {
  if (!result) return;
  if (result.leveledUp) {
    addNotification({
      type: 'level',
      emoji: '🚀',
      title: `Level up! You're now Level ${result.level}`,
      detail: getLevelTitle(result.level),
      href: '/achievements',
    });
  }
  if (Array.isArray(result.newBadges)) {
    result.newBadges.forEach((b) => {
      const meta = badgeMeta(b);
      addNotification({
        type: 'badge',
        emoji: meta.emoji,
        title: `Badge earned: ${meta.name}`,
        href: '/achievements',
      });
    });
  }
  if (result.streak >= 2) {
    addNotification({
      type: 'streak',
      emoji: '🔥',
      title: `${result.streak} day streak!`,
      detail: '+10 bonus XP',
    });
  }
  if (result.xpAwarded > 0) {
    addNotification({
      type: 'xp',
      emoji: '⚡',
      title: `+${result.xpAwarded} XP earned`,
      detail: `${(result.totalXp ?? 0).toLocaleString()} XP total`,
    });
  }
}
