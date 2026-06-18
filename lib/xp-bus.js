'use client';

// Tiny pub/sub so any XP award — lesson, chat, game, welcome bonus, admin grant
// — can surface ONE consistent popup, no matter where in the app it happened.
// The global XP popup subscribes via onXp(); awarding code calls emitXp().
//
// We only emit when there's actually something to celebrate (XP gained, a level
// up, or a new badge), so hitting a daily cap stays quiet instead of flashing
// a "+0 XP" popup.

const EVENT = 'lp:xp-awarded';

export function emitXp(result) {
  if (!result || typeof window === 'undefined') return;
  const worthShowing =
    (result.xpAwarded && result.xpAwarded > 0) ||
    result.leveledUp ||
    (Array.isArray(result.newBadges) && result.newBadges.length > 0);
  if (!worthShowing) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: result }));
}

export function onXp(handler) {
  if (typeof window === 'undefined') return () => {};
  const fn = (e) => handler(e.detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
