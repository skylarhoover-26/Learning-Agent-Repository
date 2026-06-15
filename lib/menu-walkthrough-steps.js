// Steps for the interactive spotlight walkthrough of the real UI. Shared by the
// first-run welcome popup (components/onboarding-tour.jsx) and the "Walk me
// through the menu" button on the platform deck (app/tour/page.jsx), so the two
// never drift. Each step highlights a live element via its data-tour anchor
// (added in sidebar.jsx / help-widget.jsx / user-menu.jsx). The sidebar must be
// open before the walkthrough runs so its anchors are visible.
//
// This walks through every section of the menu in order, plus the header
// (Home + your name) and the help button. Admin is intentionally left out — it
// only exists for admins, so a step pointing at it would float as a stray modal
// for everyone else.
export const MENU_WALKTHROUGH_STEPS = [
  { element: '[data-tour="menu-toggle"]', popover: { title: 'This is your menu', description: 'Tap here to open or close the navigation anytime.' } },
  { element: '[data-tour="home-link"]', popover: { title: 'Home', description: 'Your dashboard is always one tap away up here — no need to open the menu.' } },
  { element: '[data-tour="sidebar"]', popover: { title: 'Everything lives here', description: "Your menu is grouped into sections. Let's walk through each one." } },
  { element: '[data-tour="section-learn"]', popover: { title: 'Learn', description: 'All the ways to learn — Daily lessons, Discover, Games, Just Chat, the Library, and more.' } },
  { element: '[data-tour="section-progress"]', popover: { title: 'Your Progress', description: 'Track where you stand — achievements, AI impact, your knowledge heatmap, goals, and the leaderboard.' } },
  { element: '[data-tour="section-manager"]', popover: { title: 'Manager', description: 'If you lead a team, your team learning dashboard lives here.' } },
  { element: '[data-tour="section-settings"]', popover: { title: 'Settings', description: 'Switch between light and dark mode, pick your narration voice, and replay this tour anytime.' } },
  { element: '[data-tour="section-skillshop"]', popover: { title: 'HCP Skill Shop', description: "Ready for more? Jump to Housecall Pro's self-guided AI journey." } },
  { element: '[data-tour="name-menu"]', popover: { title: 'Your profile', description: 'Tap your name for your Profile, role, tasks, and projects.' } },
  { element: '[data-tour="help"]', popover: { title: 'Need a hand?', description: 'Open this chat anytime for help with the platform.' } },
];
