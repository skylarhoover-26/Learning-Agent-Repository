export function calculateSm2(quality, repetitions, easeFactor, interval) {
  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: Math.round(newEaseFactor * 100) / 100,
    interval: newInterval,
    nextReviewAt: nextReviewAt.toISOString(),
  };
}

export const QUALITY_BUTTONS = [
  { key: 'again', quality: 1, label: 'Again', sublabel: 'Forgot', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
  { key: 'hard', quality: 3, label: 'Hard', sublabel: 'Struggled', color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
  { key: 'good', quality: 4, label: 'Good', sublabel: 'Got it', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
  { key: 'easy', quality: 5, label: 'Easy', sublabel: 'Instant', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
];

export function formatNextReview(interval) {
  if (interval <= 0) return 'Now';
  if (interval === 1) return '1 day';
  if (interval < 7) return `${interval} days`;
  if (interval < 30) {
    const weeks = Math.round(interval / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  const months = Math.round(interval / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

export function getDefaultCardState() {
  return {
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
    nextReviewAt: new Date().toISOString(),
    reviewCount: 0,
    correctCount: 0,
  };
}
