'use client';

import { saveToBlob } from './sync-store';

const LESSON_KEY = 'learner_lesson_state';

export function getSavedLesson() {
  try {
    const raw = localStorage.getItem(LESSON_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSavedLesson() {
  try {
    return !!localStorage.getItem(LESSON_KEY);
  } catch {
    return false;
  }
}

export function saveLessonState(state) {
  try {
    const data = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(LESSON_KEY, JSON.stringify(data));
    saveToBlob(LESSON_KEY, data);
  } catch {
    // localStorage not available
  }
}

export function clearSavedLesson() {
  try {
    localStorage.removeItem(LESSON_KEY);
    saveToBlob(LESSON_KEY, null);
  } catch {
    // localStorage not available
  }
}
