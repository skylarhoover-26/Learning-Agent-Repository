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

export function trackLessonComplete(topic, format, durationMs) {
  trackEvent('lesson_complete', { topic, format, durationMs });
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
