// Ordered steps for the guided product tour. The TourProvider
// (components/guided-tour-provider.jsx) walks these in order, navigating between
// pages, opening the sidebar/profile dropdown, and spotlighting each element.
//
// This is a CONCISE, high-level overview — a ~60-second orientation that shows
// someone WHERE everything is and WHAT each area is for, without diving into
// every feature. It stays fully interactive: real elements are spotlighted on
// the live app (home cards, the menu, the profile dropdown), just without the
// long auto-typing / auto-running demos the deep tour used to run.
//
// Per-step fields used here:
//   element     CSS selector of the live element to highlight (data-tour anchors)
//   popover     { title, description } shown in the spotlight bubble
//   route       (optional) navigate here before highlighting
//   profileMenu (optional) 'open' | 'close' — toggle the header name dropdown so
//               its items can be highlighted
//
// The provider also supports demo fields (type / autoClick / waitFor / etc.) for
// a deeper walkthrough; this overview intentionally doesn't use them so it stays
// short. Keep steps pointed at anchors that actually exist in the current UI.
export const GUIDED_TOUR_STEPS = [
  // Home — the hub everything comes back to.
  { route: '/', element: '[data-tour="page-home"]', popover: { title: 'Welcome — this is home', description: "Your home base. Your daily pick, progress, quick links, and the latest AI news all live here. Here's the quick tour." } },

  { route: '/', element: '[data-tour="home-find-ai"]', popover: { title: 'Find AI for your work', description: 'Describe what you do and AI surfaces specific ways to use it — each one opens a lesson built around your work.' } },

  { route: '/', element: '[data-tour="home-qa-chat"]', popover: { title: 'Jump right in', description: 'Quick tiles to play a Game, open Just Chat for any AI question, or start a guided Lesson.' } },

  { route: '/', element: '[data-tour="home-todays-pick"]', popover: { title: "Today's Pick", description: 'One fresh lesson chosen for you each day, based on your gaps and recent activity.' } },

  { route: '/', element: '[data-tour="home-xp"]', popover: { title: 'Your level & XP', description: 'Your level, XP, badges, and daily streak — everything you earn as you learn.' } },

  { route: '/', element: '[data-tour="home-leaderboard"]', popover: { title: 'Team leaderboard', description: 'See how you and your teammates rank as everyone earns XP.' } },

  { route: '/', element: '[data-tour="home-skills"]', popover: { title: 'Your skills at a glance', description: 'A snapshot of your strengths and the gaps to grow — the full picture lives in your Knowledge Heatmap.' } },

  { route: '/', element: '[data-tour="home-news"]', popover: { title: 'AI News', description: 'The latest AI updates and articles, refreshed for you.' } },

  // The menu — one high-level pass over how it's organized.
  { element: '[data-tour="sidebar"]', popover: { title: 'The menu', description: "Open it anytime from the top-left. It's grouped into Learn, Your Progress, and Manager — plus Settings, where dark mode, your narration voice, and replaying this tour live." } },

  // The profile dropdown — everything personal, including your calibration.
  { element: '[data-tour="name-menu"]', popover: { title: 'Your profile', description: 'Tap your name for everything about you — My Calibration, My Impact, your Role, Tasks, Projects, and profile settings.' }, profileMenu: 'open' },

  // Help — always one tap away.
  { element: '[data-tour="help"]', popover: { title: 'Need a hand?', description: 'Open this chat anytime for help finding your way around.' }, profileMenu: 'close' },
];
