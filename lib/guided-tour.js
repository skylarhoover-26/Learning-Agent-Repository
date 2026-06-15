// Ordered steps for the guided product tour. The TourProvider
// (components/guided-tour-provider.jsx) walks these in order, navigating between
// pages, opening the sidebar/profile dropdown, and spotlighting each element.
//
// Per-step fields:
//   element     CSS selector of the live element to highlight (data-tour anchors)
//   popover     { title, description } shown in the spotlight bubble
//   route       (optional) navigate here before highlighting — used to "go into"
//               a section and explain the page itself
//   profileMenu (optional) 'open' | 'close' — toggle the header name dropdown so
//               its items can be highlighted
//
// The flow: intro → for the key Learn destinations, highlight the menu item then
// OPEN the page and explain how it works → section-level highlights for the rest
// → the profile dropdown items → help.
export const GUIDED_TOUR_STEPS = [
  // Intro
  { element: '[data-tour="menu-toggle"]', popover: { title: 'Your menu', description: 'Open or close your navigation from here anytime.' } },
  { element: '[data-tour="home-link"]', popover: { title: 'Home', description: 'Your dashboard is always one tap away — no need to open the menu.' } },
  { element: '[data-tour="sidebar"]', popover: { title: 'Everything lives here', description: "Your menu is grouped into sections. Let's open a few so you can see how they actually work." } },

  // Learn — highlight the item, then go into the page
  { element: '[data-tour="nav-daily"]', popover: { title: 'Daily', description: "A fresh, bite-sized AI lesson every day. Let's open it." } },
  { route: '/daily', element: '[data-tour="page-daily"]', popover: { title: 'Your Daily feed', description: 'A new lesson lands here each morning. Use the arrows to browse other days, or start a custom lesson right away.' } },

  { element: '[data-tour="nav-discover"]', popover: { title: 'Discover', description: 'Find AI for the real work you do. Let me show you.' } },
  { route: '/discover', element: '[data-tour="page-discover"]', popover: { title: 'Discover', description: 'Tell it about your day-to-day and it surfaces specific AI opportunities for YOUR tasks — not generic ideas.' } },

  { element: '[data-tour="nav-chat"]', popover: { title: 'Just Chat', description: 'Ask anything about AI. Opening it…' } },
  { route: '/chat', element: '[data-tour="page-chat"]', popover: { title: 'Just Chat', description: 'Ask any AI question and learn by example here — it can even launch a full guided lesson for you.' } },

  { element: '[data-tour="nav-lesson"]', popover: { title: 'Lesson', description: 'Guided lessons on any topic. Let me open it.' } },
  { route: '/lesson', element: '[data-tour="page-lesson"]', popover: { title: 'Lessons', description: 'Pick a topic and a depth — Quick Tip, Quick Lesson, or Deep Dive — and learn interactively at your pace.' } },

  { element: '[data-tour="nav-games"]', popover: { title: 'Games', description: 'Learn through quick challenges. Opening…' } },
  { route: '/games', element: '[data-tour="page-games"]', popover: { title: 'Games', description: 'Short, interactive games that build real AI skills and earn you XP.' } },

  // Rest of Learn + other sections — quick highlights
  { element: '[data-tour="section-learn"]', popover: { title: 'More ways to learn', description: 'Learn also has the Library, Modules, Practice, Prompts, and Quick Win.' } },
  { element: '[data-tour="section-skillshop"]', popover: { title: 'HCP Skill Shop', description: "Ready for more? Jump to Housecall Pro's self-guided AI journey (Beginner → Advanced)." } },
  { element: '[data-tour="section-progress"]', popover: { title: 'Your Progress', description: 'Track achievements, AI impact, your knowledge heatmap, goals, the leaderboard, and more.' } },
  { element: '[data-tour="section-manager"]', popover: { title: 'Manager', description: 'If you lead a team, your manager tools live here…' } },
  { element: '[data-tour="nav-manager"]', popover: { title: 'Team Dashboard', description: '…this is where you go for your team learning dashboard.' } },
  // Closing the dropdown here keeps state correct whether you arrive going
  // forward or backward through the tour.
  { element: '[data-tour="section-settings"]', popover: { title: 'Settings', description: 'Switch light/dark mode, pick your narration voice, and replay this tour anytime.' }, profileMenu: 'close' },

  // Profile dropdown — every step keeps it open so back/next both behave.
  { element: '[data-tour="name-menu"]', popover: { title: 'Your profile', description: 'Tap your name for everything about you.' }, profileMenu: 'open' },
  { element: '[data-tour="nav-profile"]', popover: { title: 'Profile', description: 'Your name, stats, badges, and reset options.' }, profileMenu: 'open' },
  { element: '[data-tour="nav-my-role"]', popover: { title: 'My Role', description: 'Change your department, team, experience level, or goals — lessons adapt to match.' }, profileMenu: 'open' },
  { element: '[data-tour="nav-my-tasks"]', popover: { title: 'My Tasks', description: 'Manage your day-to-day tasks so lessons fit your actual work.' }, profileMenu: 'open' },
  { element: '[data-tour="nav-projects"]', popover: { title: 'Projects', description: 'Add real work projects to tailor your lessons even further.' }, profileMenu: 'open' },

  // Help — close the dropdown on the way here.
  { element: '[data-tour="help"]', popover: { title: 'Need a hand?', description: 'Open this chat anytime for help with the platform.' }, profileMenu: 'close' },
];
