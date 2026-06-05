import { saveToBlob } from './sync-store';

const PREFIX = 'lp_';

function key(type, learnerId) {
  return `${PREFIX}${type}_${learnerId}`;
}

function read(type, learnerId) {
  try {
    const raw = localStorage.getItem(key(type, learnerId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(type, learnerId, data) {
  try {
    localStorage.setItem(key(type, learnerId), JSON.stringify(data));
    saveToBlob(key(type, learnerId), data);
  } catch {
    // localStorage full or unavailable
  }
}

export function getXpEvents(learnerId) {
  return read('xp', learnerId);
}

export function addXpEvent(learnerId, event) {
  const events = getXpEvents(learnerId);
  events.push({ ...event, id: `xp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
  write('xp', learnerId, events);
}

export function getBadgesEarned(learnerId) {
  return read('badges', learnerId);
}

export function addBadgeEarned(learnerId, badgeId) {
  const badges = getBadgesEarned(learnerId);
  if (badges.some(b => b.badge_id === badgeId)) return false;
  badges.push({ badge_id: badgeId, earned_at: new Date().toISOString() });
  write('badges', learnerId, badges);
  return true;
}

export function getLessonHistory(learnerId) {
  return read('lessons', learnerId);
}

export function addLessonRecord(learnerId, record) {
  const lessons = getLessonHistory(learnerId);
  lessons.push(record);
  write('lessons', learnerId, lessons);
}

export function getAllData(learnerId) {
  return {
    xpEvents: getXpEvents(learnerId),
    badgesEarned: getBadgesEarned(learnerId),
    lessonHistory: getLessonHistory(learnerId),
  };
}
