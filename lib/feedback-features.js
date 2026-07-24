// Feature areas a piece of feedback can be tagged against, so admins can slice
// the queue by which part of the app a report is about (e.g. "show me every
// complaint about Lessons"). The AI suggests one at triage time from the report
// text + the page it was filed on; admins can always override via the dropdown.
//
// Keep this list aligned with the app's real surfaces (see lib/menu-catalog.js).
export const FEATURE_AREAS = [
  'Lesson',
  'Discovery',
  'Library',
  'Games',
  'Prompts',
  'Just Chat',
  "Today's Pick",
  'Achievements',
  'Knowledge Heatmap',
  'Leaderboard',
  'Quests',
  'Onboarding',
  'Calibration',
  'Home',
  'Profile & Settings',
  'Manager Dashboard',
  'Reporting',
  'Admin',
  'Slack',
  'Other',
];

// Short hint per area — the route(s) it lives under and what it does. Feeds the
// AI classifier so it can map a report (and the page path it came from) onto the
// right area. Not every area needs a hint; unlisted ones fall back to the name.
export const FEATURE_HINTS = {
  Lesson: '/lesson — a guided, generated lesson on a topic (quick lesson or deep dive).',
  Discovery: '/discover — find AI use cases for your role/work.',
  Library: '/library — browse ready-to-use AI use cases.',
  Games: '/games — interactive learning games (Jeopardy, Speed Round, etc.).',
  Prompts: '/prompts — ready-to-use prompt library.',
  'Just Chat': '/chat — free-form chat with the AI coach.',
  "Today's Pick": "/daily — the personalized daily lesson pick.",
  Achievements: '/achievements — badges and milestones.',
  'Knowledge Heatmap': '/heatmap — strengths/gaps visualization.',
  Leaderboard: '/leaderboard — team ranking and XP.',
  Quests: 'project quests / multi-step learning paths.',
  Onboarding: 'first-run onboarding / profile setup flow.',
  Calibration: 'the calibration gate / AI-impact self-assessment.',
  Home: '/ — the home screen, nav, and shell.',
  'Profile & Settings': 'profile menu, account settings, preferences.',
  'Manager Dashboard': '/manager — team dashboard for managers.',
  Reporting: '/reporting — org-wide activity and progress.',
  Admin: '/admin — admin tools (menu visibility, feedback, conversations).',
  Slack: 'the Slack DM coach / notifications.',
  Other: 'anything that does not clearly fit one area, or spans several.',
};
