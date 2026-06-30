// Friendly labels for the "what people are doing" breakdown, shared by the server
// rollup and the client (so filtered/compare views can re-label per-type counts
// without a round-trip). Intermediate/outcome events (page views, mid-lesson
// steps, XP/badge grants) are skipped so the chart shows deliberate actions.
export const ACTIVITY_LABELS = {
  lesson_complete: 'Lessons completed',
  lesson_start: 'Lessons started',
  lesson_plan: 'Guided lesson steps',
  lesson_qa: 'In-lesson questions',
  lesson_video: 'Narrated lessons',
  chat: 'Coach chats',
  discover: 'AI discovery searches',
  quiz_attempt: 'Quiz answers',
  game_complete: 'Games played',
  quick_win: 'Quick wins',
  scoring: 'AI Impact check-ins',
  grade: 'Activities graded',
  score_prompt: 'Prompt scoring',
  review_card: 'Review cards',
  module_complete: 'Modules completed',
  section_read: 'Sections read',
  onboarding_complete: 'Onboarded',
};

export const ACTIVITY_SKIP = new Set([
  'page_visit', 'lesson_continue', 'xp_earned', 'badge_earned', 'discuss', 'tones',
]);

// Turn a { type: count } map into labeled, sorted, top-N entries for a bar chart.
export function activityFromByType(byType, limit = 10) {
  return Object.entries(byType || {})
    .filter(([type]) => !ACTIVITY_SKIP.has(type))
    .map(([type, count]) => ({ type, label: ACTIVITY_LABELS[type] || type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
