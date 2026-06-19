'use client';

// Conversational (Quick Tip) lesson saves now live in the unified paused-lessons
// list alongside plan-driven lessons, so they all show in one "Paused lessons"
// box. This module keeps the old function names as thin adapters.
import { upsertPausedLesson, getPausedLesson, removePausedLesson } from './paused-lessons';

export function getSavedLesson(topic, format = 'quick_tip') {
  if (!topic) return null;
  return getPausedLesson(format, topic)?.state || null;
}

export function saveLessonState(state) {
  if (!state?.topic) return;
  const stepLabel = state.slides?.length ? `Step ${(state.currentSlideIdx || 0) + 1} of ${state.slides.length}` : '';
  upsertPausedLesson({
    format: state.format || 'quick_tip',
    topic: state.topic,
    state,
    stepLabel,
    startedAt: state.lessonStartedAt,
  });
}

// Conversational-only clear: never touches plan-driven lessons (those are managed
// by the plan player), so exiting/finishing a quick tip can't wipe a paused
// Deep Dive or Project Quest.
export function clearSavedLesson(topic, format = 'quick_tip') {
  if (!topic || (format && format !== 'quick_tip')) return;
  removePausedLesson(format, topic);
}
