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
//   requiresItem (optional) a Menu Visibility href — the step is DROPPED when that
//               item is hidden or "coming soon" for this viewer, so the tour never
//               spotlights a feature that isn't on screen for them
//
// The provider also supports demo fields (type / autoClick / waitFor / etc.) for
// a deeper walkthrough; this overview intentionally doesn't use them so it stays
// short. Keep steps pointed at anchors that actually exist in the current UI.
export const GUIDED_TOUR_STEPS = [
  // Home — the hub everything comes back to. Steps follow the page top-to-bottom
  // so the spotlight only ever scrolls downward (no jump back up to the hero).
  { route: '/', element: '[data-tour="page-home"]', popover: { title: 'This is your home base', description: "Everything starts here — your daily pick, your progress, and the latest AI news. Let's take a quick look around." } },

  // Level journey / XP lives in the hero (top-right), so it comes right after the intro.
  { route: '/', element: '[data-tour="home-xp"]', popover: { title: 'This is where your progress lives', description: 'Your level, XP, badges, and daily streak — everything you earn as you learn.' } },

  { route: '/', element: '[data-tour="home-find-ai"]', requiresItem: '/discover', popover: { title: 'Here’s where you find AI for your work', description: 'Describe what you do and AI turns it into specific ways to use it — each one opens a lesson built around your job.' } },

  { route: '/', element: '[data-tour="home-qa-chat"]', popover: { title: 'Your quick starts live here', description: 'These tiles jump you straight in — play a Game, ask anything in Just Chat, or begin a guided Lesson.' } },

  { route: '/', element: '[data-tour="home-todays-pick"]', requiresItem: '/daily', popover: { title: 'Today’s Pick sits right here', description: 'One fresh lesson chosen for you each day, based on your gaps and recent activity.' } },

  { route: '/', element: '[data-tour="home-leaderboard"]', requiresItem: '/leaderboard', popover: { title: 'The team leaderboard is here', description: 'See how you and your teammates stack up as everyone earns XP.' } },

  { route: '/', element: '[data-tour="home-skills"]', popover: { title: 'Your skills at a glance', description: 'Right here you’ll see your strengths and gaps — the full view lives in your Knowledge Heatmap.' } },

  { route: '/', element: '[data-tour="home-news"]', requiresItem: '/ai-news', popover: { title: 'AI news lives here', description: 'The latest AI updates, refreshed daily — tap any card to turn it into a lesson.' } },

  // The menu — one high-level pass over how it's organized.
  { element: '[data-tour="sidebar"]', popover: { title: 'This menu gets you everywhere', description: "It stays open as you go, grouped into Learn, Your Progress, and Manager — plus Settings, where dark mode, your narration voice, and replaying this tour live." } },

  // The profile dropdown — everything personal, including your calibration.
  { element: '[data-tour="name-menu"]', popover: { title: 'Everything about you lives here', description: 'Your name up top opens My Calibration, My Impact, your Role, Tasks, Projects, and profile settings.' }, profileMenu: 'open' },

  // Help — always one tap away.
  { element: '[data-tour="help"]', popover: { title: 'Help is always right here', description: 'Stuck anywhere? Open this chat and it’ll help you find your way around.' }, profileMenu: 'close' },
];
