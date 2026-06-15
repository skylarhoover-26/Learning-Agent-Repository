// Steps for the interactive spotlight walkthrough of the real UI. Shared by the
// first-run welcome popup (components/onboarding-tour.jsx) and the "Walk me
// through the menu" button on the platform deck (app/tour/page.jsx), so the two
// never drift. Each step highlights a live element via its data-tour anchor
// (added in sidebar.jsx / help-widget.jsx). The sidebar must be open before the
// walkthrough runs so its anchors are visible.
export const MENU_WALKTHROUGH_STEPS = [
  { element: '[data-tour="menu-toggle"]', popover: { title: 'This is your menu', description: 'Tap here to open or close the navigation anytime.' } },
  { element: '[data-tour="sidebar"]', popover: { title: 'Everything lives here', description: 'Your navigation is grouped into Account, Learn, and Your Progress.' } },
  { element: '[data-tour="dark-mode"]', popover: { title: 'Light or dark', description: "Switch the app's appearance whenever you like." } },
  { element: '[data-tour="nav-daily"]', popover: { title: 'Daily', description: 'A fresh, bite-sized AI lesson every day — the easiest way to build a habit.' } },
  { element: '[data-tour="nav-discover"]', popover: { title: 'Discover', description: 'Find AI for the real tasks you do at work, based on your role.' } },
  { element: '[data-tour="nav-chat"]', popover: { title: 'Just Chat', description: 'Ask anything about AI — it can even launch a lesson for you.' } },
  { element: '[data-tour="help"]', popover: { title: 'Need a hand?', description: 'Open this chat anytime for help with the platform.' } },
];
