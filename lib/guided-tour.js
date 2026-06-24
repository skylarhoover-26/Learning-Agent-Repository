// Ordered steps for the guided product tour. The TourProvider
// (components/guided-tour-provider.jsx) walks these in order, navigating between
// pages, opening the sidebar/profile dropdown, and spotlighting each element.
//
// Per-step fields:
//   element     CSS selector of the live element to highlight (data-tour anchors)
//   popover     { title, description } shown in the spotlight bubble
//   route       (optional) navigate here before highlighting — used to "go into"
//               a section and demonstrate it, then come back
//   profileMenu (optional) 'open' | 'close' — toggle the header name dropdown so
//               its items can be highlighted
//   type        (optional) { selector, text } — animate typing `text` into a live
//               input/textarea so people see how the box works (real React onChange)
//   autoClick   (optional) selector of a button to programmatically click once the
//               step is shown — fires the real action (chat reply, Discover search,
//               lesson start) so the demo shows the button actually working
//   ensure      (optional) { selector, text } — guarantee this input holds `text`
//               right before the auto-click, so the button is enabled and the
//               action actually fires even if the typing animation was missed
//   autoClickDelay (optional) ms to wait before the auto-click (default 600)
//   waitFor     (optional) selector — locks the Next button ("Generating…") until
//               this element appears, so people can't skip ahead before the
//               generated result (results, reply, lesson) lands
//   waitForTimeout (optional) ms before giving up the wait-lock (default 20000)
//   advanceOnReady (optional) once waitFor resolves, auto-advance to the next step
//               — used when the clicked button gets replaced by the result, so the
//               spotlight lands on the generated content instead of floating
//   advanceDelay (optional) ms to linger after the result lands before the
//               auto-advance fires (default 150) — give the learner time to see it
//
// The flow: intro → home screen, where each card/button is highlighted; for the
// "Find AI" hero and the five quick-link buttons we DIVE into the section, show
// how to use it, then the next home highlight (route '/') automatically returns us
// home → open the menu for the sections that DON'T live on the home screen (Daily,
// and the section-level groups) → the profile dropdown items → help.
//
// Note: there are no explicit "back to home" steps — each home highlight carries
// route '/', so moving on from a section dive brings the tour home on its own.
export const GUIDED_TOUR_STEPS = [
  // Intro — menu toggle, the Home button, then the home screen it returns you to.
  { element: '[data-tour="menu-toggle"]', popover: { title: 'Your menu', description: 'This menu slides out over the page. Open it anytime with the menu button in the top-left, and close it here with the ✕.' } },
  { element: '[data-tour="home-link"]', popover: { title: 'Home', description: 'Your dashboard is always one tap away — no need to open the menu.' } },
  { route: '/', element: '[data-tour="page-home"]', popover: { title: 'Your home screen', description: 'Tapping Home brings you right back here. Your daily lesson pick, XP and streak, quick links to every section, and the latest AI news all live on this screen — your starting point each visit.' } },

  // Home screen — highlight each card/button. For the "Find AI" hero and the five
  // quick links we dive into the section and demonstrate it, then return home.
  { route: '/', element: '[data-tour="home-xp"]', popover: { title: 'Your level & XP', description: "Track your level, XP, and the badges you've earned. Tap it to open your achievements — let's take a look." } },
  { route: '/achievements', element: '[data-tour="page-achievements"]', popover: { title: 'Your achievements', description: 'Every badge and milestone you earn lives here. Then we head back home.' } },

  { route: '/', element: '[data-tour="home-find-ai"]', popover: { title: 'Find AI for your work', description: "Your shortcut to Discover. Let's open it and see how it works." } },
  { route: '/discover', element: '[data-tour="discover-input"]', popover: { title: 'Describe your work', description: "Tell it about your day-to-day in this box. Watch — I'll type an example for you." }, type: { selector: '[data-tour="discover-input"]', text: "I'm an Operations Manager. My day is status meetings, reviewing project updates, planning next quarter, and writing reports." } },
  // One step on the stable <main>: it runs Find AI and the results appear right
  // here in place — no run->results transition to get stranded on.
  { route: '/discover', element: '[data-tour="discover-main"]', popover: { title: 'Now let AI find opportunities', description: "Normally you'd hit “Find AI for me.” Watch — I'll run it, and specific AI opportunities tailored to YOUR work appear right here. Tap any one to open a lesson built around it. Then we head back home." }, ensure: { selector: '[data-tour="discover-input"]', text: "I'm an Operations Manager. My day is status meetings, reviewing project updates, planning next quarter, and writing reports." }, autoClick: '[data-tour="discover-send"]', waitFor: '[data-tour="discover-results"]', advanceOnReady: true, advanceDelay: 3000 },

  { route: '/', element: '[data-tour="home-qa-games"]', popover: { title: 'Games', description: "Quick link to the learning games. Let's pop in." } },
  { route: '/games', element: '[data-tour="game-card"]', popover: { title: 'Games — how to use it', description: 'Each card shows its difficulty and length. Hit Play to jump straight in — every round earns you XP. Then back home we go.' } },

  { route: '/', element: '[data-tour="home-qa-chat"]', popover: { title: 'Just Chat', description: "Quick link to your free-form AI chat. Let's open it and try it out." } },
  { route: '/chat', element: '[data-tour="chat-suggestions"]', popover: { title: 'Start with a suggestion', description: "Not sure what to ask? Tap one of these and it drops straight into the box for you." } },
  { route: '/chat', element: '[data-tour="chat-input"]', popover: { title: 'Type your question', description: "Or type any AI question in plain language — no special wording needed. Watch, I'll type one in." }, type: { selector: '[data-tour="chat-input"]', text: "What's a good way to use AI to summarize long email threads?" } },
  { route: '/chat', element: '[data-tour="chat-send"]', popover: { title: 'Send it', description: "This is send — normally you'd hit it or press Enter. Watch, I'll send it for you and the reply comes in below." }, ensure: { selector: '[data-tour="chat-input"]', text: "What's a good way to use AI to summarize long email threads?" }, autoClick: '[data-tour="chat-send"]', waitFor: '[data-tour="chat-reply"]', advanceOnReady: true },
  { route: '/chat', element: '[data-tour="chat-thread"]', popover: { title: 'Read the reply', description: "Your answer appears right here. Keep the conversation going with follow-ups, and when a question is lesson-worthy the reply can even launch a full guided lesson. Then we head back home." } },

  { route: '/', element: '[data-tour="home-qa-library"]', popover: { title: 'Discovery Library', description: "Quick link to the Discovery Library — find AI for your work and browse the use case library. Let's take a look." } },
  { route: '/discover', element: '[data-tour="library-search"]', popover: { title: 'Search the use case library', description: "Below the Find AI box, browse 30 ready-to-use AI use cases — filter them as you type. Watch — I'll search “email” and the list narrows instantly. Then back home." }, type: { selector: '[data-tour="library-search"]', text: 'email' } },

  { route: '/quests', element: '[data-tour="page-quests"]', popover: { title: 'Project Quests — how to use it', description: 'Browse these hands-on quests, pick one, and work through the steps to build something real — earning XP along the way. You can also reach these from the Lesson screen. Then we head back home.' } },

  { route: '/', element: '[data-tour="home-qa-lesson"]', popover: { title: 'Lesson', description: "Quick link to start a guided lesson. Let's open it and walk through it." } },
  { route: '/lesson', element: '[data-tour="page-lesson"]', popover: { title: 'Step 1 — how deep?', description: 'Start by choosing the depth: a 60-second Quick Tip, a hands-on Quick Lesson, a thorough Deep Dive — or a Project Quest to build something real.' } },
  { route: '/lesson', element: '[data-tour="lesson-mode"]', popover: { title: 'Step 2 — how you learn', description: 'Pick your style — read & practice interactively, or sit back and watch a short narrated version.' } },
  { route: '/lesson', element: '[data-tour="lesson-topics"]', popover: { title: 'Step 3 — pick a topic', description: 'Tap a suggested topic, hit Surprise me for an instant ready-to-use AI win, or type your own just below.' } },
  { route: '/lesson', element: '[data-tour="lesson-custom-input"]', popover: { title: 'Type your own topic', description: "Want something specific? Type it here. Watch — I'll fill one in." }, type: { selector: '[data-tour="lesson-custom-input"]', text: 'How to use AI to draft status update emails' } },
  // One step on the stable <main> (reused across the picker -> lesson swap): it
  // hits Start and the lesson builds right here — no transition to strand on.
  { route: '/lesson', element: '[data-tour="lesson-main"]', popover: { title: 'Start the lesson', description: "This is Start — watch, I'll run it for you. Your lesson builds around that topic right here, and you work through it step by step, answering and asking questions as you go. Then we head back home." }, ensure: { selector: '[data-tour="lesson-custom-input"]', text: 'How to use AI to draft status update emails' }, autoClick: '[data-tour="lesson-start"]', waitFor: '[data-tour="lesson-content"]', advanceOnReady: true, advanceDelay: 3000 },

  // Today's Pick opens a ready-made lesson — click it and let it build.
  { route: '/', element: '[data-tour="home-todays-pick"]', popover: { title: "Today's Pick", description: "A lesson hand-picked for you each day based on your progress. Watch — I'll open it." }, autoClick: '[data-tour="home-todays-pick"]', waitFor: '[data-tour="lesson-content"]', advanceOnReady: true },
  { element: '[data-tour="lesson-main"]', popover: { title: "Your pick, ready to go", description: "Today's Pick drops you straight into a lesson built around it — no setup needed. Then we head back home." } },

  { route: '/', element: '[data-tour="home-streak"]', popover: { title: 'Your streak', description: "See how many days in a row you've been learning — keep it alive!" } },

  { route: '/', element: '[data-tour="home-leaderboard"]', popover: { title: 'Department Leaderboard', description: "See how your team is doing. Let's open the full leaderboard." } },
  { route: '/leaderboard', element: '[data-tour="page-leaderboard"]', popover: { title: 'The leaderboard', description: 'See where you and your teammates rank as everyone earns XP. Then back home.' } },

  { route: '/', element: '[data-tour="home-skills"]', popover: { title: 'Your Skills', description: "A snapshot of your strong skills, the ones growing, and gaps to work on. Let's open your full skill graph." } },
  { route: '/skill-graph', element: '[data-tour="page-skill-graph"]', popover: { title: 'Your skill graph', description: 'The full map of your AI skills and how they connect. Then we head back home.' } },

  { route: '/', element: '[data-tour="home-news"]', popover: { title: 'AI News', description: 'The latest AI updates and articles, refreshed for you — tap any item to read more.' } },

  // The menu — for everything that ISN'T a card on the home screen.
  { element: '[data-tour="sidebar"]', popover: { title: 'Everything lives here', description: "Your full menu is grouped into sections. A few — like Discover, Games, Chat, Library, Quests, and Lessons — you just saw from the home screen. Here's what else lives in the menu." } },

  // Today's Pick is a single personalized lesson — opening it launches that
  // lesson directly, so we just highlight it rather than diving in.
  { element: '[data-tour="nav-daily"]', popover: { title: "Today's Pick", description: "One personalized lesson chosen for you each day from your skill gaps and recent activity. Click it any day to jump straight in." } },

  // Section-level highlights for the rest of the menu.
  { element: '[data-tour="section-learn"]', popover: { title: 'More ways to learn', description: 'Learn also has Modules, Practice, and Prompts.' } },
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
