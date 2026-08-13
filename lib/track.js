'use client';

function getUserInfo() {
  try {
    const raw = localStorage.getItem('learner_profile');
    if (raw) {
      const profile = JSON.parse(raw);
      return {
        email: profile.email || profile.id || 'unknown',
        name: profile.display_name || profile.first_name || 'Unknown',
        department: profile.department || null,
        tier: profile.tier || null,
      };
    }
  } catch {
    // ignore
  }
  return { email: 'unknown', name: 'Unknown' };
}

export function trackEvent(event, data = {}) {
  try {
    const user = getUserInfo();
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, user }),
    }).catch(() => {});
  } catch {
    // tracking is best-effort
  }
}

export function trackPageVisit(pageName, path) {
  trackEvent('page_visit', { page: pageName, path });
}

export function trackOnboardingComplete(profile) {
  trackEvent('onboarding_complete', {
    name: profile.display_name,
    department: profile.department,
    tier: profile.tier,
    goal: profile.goal,
  });
}

// `result` carries how they actually did: correctness 0..1 from the lesson's
// quiz questions, and the raw right-answer count.
//
// This used to record only topic/format/duration, so the activity log could say
// someone finished a lesson but never whether they got any of it right — and
// that is most of what "how are people doing" means. Adaptive levelling reads
// the same numbers, so a level change can be explained from the log.
export function trackLessonComplete(topic, format, durationMs, result = {}) {
  const { correctness, quizCorrect, quizTotal } = result;
  trackEvent('lesson_complete', {
    topic,
    format,
    durationMs,
    correctness: typeof correctness === 'number' ? Math.round(correctness * 100) / 100 : null,
    scorePercent: typeof correctness === 'number' ? Math.round(correctness * 100) : null,
    quizCorrect: quizCorrect ?? null,
    quizTotal: quizTotal ?? null,
    passed: typeof correctness === 'number' ? correctness >= 0.7 : null,
  });
}

// Games were not tracked at all — a whole activity type missing from the log,
// and from any reporting built on it.
export function trackGameComplete(slug, result = {}) {
  const { fraction, score, xp } = result;
  trackEvent('game_complete', {
    game: slug,
    correctness: typeof fraction === 'number' ? Math.round(fraction * 100) / 100 : null,
    scorePercent: typeof fraction === 'number' ? Math.round(fraction * 100) : null,
    score: score ?? null,
    xp: xp ?? null,
  });
}

// A learner's lesson difficulty moving up or down. Logged so a level change is
// auditable after the fact rather than being an unexplained shift someone
// noticed in their lessons.
export function trackLevelChange({ from, to, score, samples, reason }) {
  trackEvent('level_change', { from, to, score, samples, reason });
}

export function trackModuleSectionRead(moduleNum, moduleTitle, sectionTitle) {
  trackEvent('section_read', { moduleNum, moduleTitle, sectionTitle });
}

export function trackQuizAttempt(moduleNum, moduleTitle, isCorrect, attempt, maxAttempts) {
  trackEvent('quiz_attempt', { moduleNum, moduleTitle, isCorrect, attempt, maxAttempts });
}

export function trackModuleComplete(moduleNum, moduleTitle) {
  trackEvent('module_complete', { moduleNum, moduleTitle });
}

export function trackXpEarned(amount, source) {
  trackEvent('xp_earned', { amount, source });
}

export function trackBadgeEarned(badgeId) {
  trackEvent('badge_earned', { badgeId });
}

export function trackQuestComplete(questId, questTitle, xpReward) {
  trackEvent('quest_complete', { questId, questTitle, xpReward });
}

export function trackReviewCard(cardId, category, quality, correct) {
  trackEvent('review_card', { cardId, category, quality, correct });
}
