import { saveToBlob, replaceInBlob } from './sync-store';

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

// Same as write(), but tells the server to overwrite instead of merge. Only for
// deliberate rewinds — see replaceAllData below.
function writeReplace(type, learnerId, data) {
  try {
    localStorage.setItem(key(type, learnerId), JSON.stringify(data));
    replaceInBlob(key(type, learnerId), data);
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

// Overwrite all progress for a learner — used to restore a role snapshot.
//
// A snapshot restore is a genuine rewind: the saved progress replaces whatever is
// there now, including entries the snapshot predates. Ledger POSTs merge by
// default (lib/ledger-merge.js), so this path has to write in replace mode or the
// restore would union old and new and quietly leave the learner ahead of the
// snapshot they asked to go back to.
export function replaceAllData(learnerId, data) {
  writeReplace('xp', learnerId, Array.isArray(data?.xpEvents) ? data.xpEvents : []);
  writeReplace('badges', learnerId, Array.isArray(data?.badgesEarned) ? data.badgesEarned : []);
  writeReplace('lessons', learnerId, Array.isArray(data?.lessonHistory) ? data.lessonHistory : []);
}
