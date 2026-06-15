// Steps for the interactive spotlight walkthrough of the real UI. Shared by the
// first-run welcome popup (components/onboarding-tour.jsx), the "Tour" item in
// the menu's Settings section, and the "Walk me through the menu" button on the
// platform deck (app/tour/page.jsx) — so they never drift. Each step highlights
// a live element via its data-tour anchor (sidebar.jsx / help-widget.jsx /
// user-menu.jsx). The sidebar must be open before the walkthrough runs.
//
// This walks every section AND every destination inside it, top to bottom, so a
// learner sees exactly where each thing lives (e.g. Manager → Team Dashboard).
// Item anchors are 'nav' + href ('/my-tasks' -> 'nav-my-tasks'), matching
// navItemTour() in sidebar.jsx. Admin is left out — it only exists for admins,
// so a step pointing at it would float as a stray modal for everyone else.
export const MENU_WALKTHROUGH_STEPS = [
  { element: '[data-tour="menu-toggle"]', popover: { title: 'This is your menu', description: 'Tap here to open or close the navigation anytime.' } },
  { element: '[data-tour="home-link"]', popover: { title: 'Home', description: 'Your dashboard is always one tap away up here — no need to open the menu.' } },
  { element: '[data-tour="sidebar"]', popover: { title: 'Everything lives here', description: "Your menu is grouped into sections. Let's walk through each one and what's inside." } },

  // Learn
  { element: '[data-tour="section-learn"]', popover: { title: 'Learn', description: 'All the ways to learn live here.' } },
  { element: '[data-tour="nav-daily"]', popover: { title: 'Daily', description: 'A fresh, bite-sized AI lesson every day — the easiest way to build a habit.' } },
  { element: '[data-tour="nav-discover"]', popover: { title: 'Discover', description: 'Find AI opportunities for the real tasks you do at work.' } },
  { element: '[data-tour="nav-games"]', popover: { title: 'Games', description: 'Learn AI through quick, interactive games.' } },
  { element: '[data-tour="nav-chat"]', popover: { title: 'Just Chat', description: 'Ask anything about AI — it can even launch a lesson for you.' } },
  { element: '[data-tour="nav-lesson"]', popover: { title: 'Lesson', description: 'Pick a topic and depth for a guided lesson.' } },
  { element: '[data-tour="nav-library"]', popover: { title: 'Library', description: 'Browse saved AI resources and references.' } },
  { element: '[data-tour="nav-modules"]', popover: { title: 'Modules', description: 'Structured, multi-lesson learning paths.' } },
  { element: '[data-tour="nav-structured-lesson"]', popover: { title: 'Practice', description: 'Hands-on exercises with instant feedback.' } },
  { element: '[data-tour="nav-prompts"]', popover: { title: 'Prompts', description: 'Ready-to-use prompts for your tasks.' } },
  { element: '[data-tour="nav-quick-win"]', popover: { title: 'Quick Win', description: 'A fast, practical AI task you can use right now.' } },

  // HCP Skill Shop
  { element: '[data-tour="section-skillshop"]', popover: { title: 'HCP Skill Shop', description: "Ready for more? Jump to Housecall Pro's self-guided AI journey (Beginner → Advanced)." } },

  // Your Progress
  { element: '[data-tour="section-progress"]', popover: { title: 'Your Progress', description: 'Track where you stand across all of these.' } },
  { element: '[data-tour="nav-achievements"]', popover: { title: 'Achievements', description: 'Badges and milestones you have earned.' } },
  { element: '[data-tour="nav-scoring"]', popover: { title: 'AI Impact', description: 'Measure how AI is helping your work.' } },
  { element: '[data-tour="nav-calibration"]', popover: { title: 'Calibrate', description: 'Tune lessons to your current level.' } },
  { element: '[data-tour="nav-checkin"]', popover: { title: 'Check-in', description: 'A quick pulse on your progress.' } },
  { element: '[data-tour="nav-goals"]', popover: { title: 'Goals', description: 'Set and track your learning goals.' } },
  { element: '[data-tour="nav-heatmap"]', popover: { title: 'Knowledge Heatmap', description: 'See where you are strong and where to grow.' } },
  { element: '[data-tour="nav-leaderboard"]', popover: { title: 'Leaderboard', description: 'See how you rank across your team.' } },
  { element: '[data-tour="nav-quests"]', popover: { title: 'Quests', description: 'Build something real, start to finish.' } },
  { element: '[data-tour="nav-review"]', popover: { title: 'Review', description: 'Revisit key concepts so they stick.' } },
  { element: '[data-tour="nav-skill-graph"]', popover: { title: 'Skill Graph', description: 'A visual map of your AI skills.' } },

  // Manager
  { element: '[data-tour="section-manager"]', popover: { title: 'Manager', description: 'If you lead a team, your manager tools live here.' } },
  { element: '[data-tour="nav-manager"]', popover: { title: 'Team Dashboard', description: 'This is where you go for your team learning dashboard.' } },

  // Settings
  { element: '[data-tour="section-settings"]', popover: { title: 'Settings', description: 'Personalize the app here.' } },
  { element: '[data-tour="dark-mode"]', popover: { title: 'Light or dark', description: "Switch the app's appearance whenever you like." } },
  { element: '[data-tour="nav-voice"]', popover: { title: 'Voice', description: 'Pick the narration voice for spoken lessons.' } },

  // Header + help
  { element: '[data-tour="name-menu"]', popover: { title: 'Your profile', description: 'Tap your name for your Profile, role, tasks, and projects.' } },
  { element: '[data-tour="help"]', popover: { title: 'Need a hand?', description: 'Open this chat anytime for help with the platform.' } },
];
