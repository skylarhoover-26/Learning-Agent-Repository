'use client';

const STORAGE_KEY = 'curated_lessons';

export function getCuratedLessons() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCuratedLesson(lesson) {
  const lessons = getCuratedLessons();
  const newLesson = {
    ...lesson,
    id: lesson.id || `curated_${Date.now()}`,
    createdAt: lesson.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = lessons.findIndex((l) => l.id === newLesson.id);
  const updated =
    existingIdx >= 0
      ? lessons.map((l, i) => (i === existingIdx ? newLesson : l))
      : [...lessons, newLesson];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newLesson;
}

export function deleteCuratedLesson(id) {
  const lessons = getCuratedLessons();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(lessons.filter((l) => l.id !== id))
  );
}

export function getCuratedLessonById(id) {
  return getCuratedLessons().find((l) => l.id === id) || null;
}
