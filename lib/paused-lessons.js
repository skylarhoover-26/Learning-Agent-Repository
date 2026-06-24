'use client';

import { saveToBlob } from './sync-store';

// A single browser-stored LIST of in-progress ("paused") lessons across all
// formats — Quick Tip, Quick Lesson, Deep Dive, Project Quest. Replaces the old
// single-slot saves so starting a new lesson no longer wipes another's progress.
// Keyed by format+topic, ordered by last-accessed, capped so storage can't bloat.
const KEY = 'lp_paused_lessons';
const CAP = 10;

// One-time import of the OLD single-slot saves (a plan lesson under
// 'lp_plan_lesson' and a conversational lesson under 'learner_lesson_state')
// into this list, so lessons paused before the multi-store existed aren't
// stranded. Runs at most once per page load and clears the old keys after.
let migrated = false;
function migrateLegacy() {
  if (migrated) return;
  migrated = true;
  try {
    const plan = JSON.parse(localStorage.getItem('lp_plan_lesson') || 'null');
    if (plan && plan.topic && plan.plan) {
      upsertPausedLesson({
        format: plan.format || 'standard',
        topic: plan.topic,
        state: plan,
        stepLabel: plan.steps?.length ? `Step ${(plan.stepIdx || 0) + 1} of ${plan.steps.length}` : '',
        startedAt: plan.startedAt,
      });
    }
    localStorage.removeItem('lp_plan_lesson');

    const conv = JSON.parse(localStorage.getItem('learner_lesson_state') || 'null');
    if (conv && conv.topic) {
      upsertPausedLesson({
        format: conv.format || 'quick_tip',
        topic: conv.topic,
        state: conv,
        stepLabel: conv.slides?.length ? `Step ${(conv.currentSlideIdx || 0) + 1} of ${conv.slides.length}` : '',
        startedAt: conv.lessonStartedAt,
      });
    }
    localStorage.removeItem('learner_lesson_state');
  } catch {
    // best-effort migration
  }
}

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
    // Let the header bell / menu badge update live when lessons are paused or resumed.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('paused-lessons:changed'));
    }
  } catch {
    // localStorage unavailable
  }
}

export function entryKey(format, topic) {
  return `${format || 'standard'}::${(topic || '').trim().toLowerCase()}`;
}

// "3h ago" / "yesterday" — a friendly relative label for when a lesson was last
// opened. Shared by the picker box and the header bell/menu.
export function relativeAccessTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

// An absolute calendar date (e.g. "Jun 24") for when a lesson was last opened.
export function absoluteAccessDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Most-recently-accessed first.
export function listPausedLessons() {
  migrateLegacy();
  return read().sort((a, b) => String(b.lastAccessedAt || '').localeCompare(String(a.lastAccessedAt || '')));
}

export function getPausedLesson(format, topic) {
  migrateLegacy();
  const k = entryKey(format, topic);
  return read().find((e) => e.key === k) || null;
}

// Insert or update the entry for this (format, topic), bumping last-accessed and
// trimming the least-recently-accessed beyond the cap.
export function upsertPausedLesson({ format, topic, state, stepLabel = '', startedAt }) {
  if (!topic) return;
  const k = entryKey(format, topic);
  const now = new Date().toISOString();
  const existing = read().find((e) => e.key === k);
  const rest = read().filter((e) => e.key !== k);
  const entry = {
    key: k,
    format: format || 'standard',
    topic,
    state,
    stepLabel,
    startedAt: startedAt || existing?.startedAt || now,
    lastAccessedAt: now,
  };
  const list = [entry, ...rest]
    .sort((a, b) => String(b.lastAccessedAt || '').localeCompare(String(a.lastAccessedAt || '')))
    .slice(0, CAP);
  write(list);
}

export function removePausedLesson(format, topic) {
  const k = entryKey(format, topic);
  write(read().filter((e) => e.key !== k));
}

export function removePausedLessonByKey(key) {
  write(read().filter((e) => e.key !== key));
}
