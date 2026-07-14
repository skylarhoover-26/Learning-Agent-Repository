// Single source of truth for the toggleable items in the profile (name) menu.
// Plain, serializable data — the profile dropdown (components/user-menu.jsx)
// attaches icons locally, while the admin "Profile Visibility" page and the
// server-side validation in lib/profile-visibility.js read this same list, so
// they can't drift apart. Keep hrefs/labels in sync with PROFILE_LINKS.
//
// Log out and the admin "Preview as user" toggle are intentionally NOT here —
// they must always work.

export const PROFILE_CATALOG = [
  { href: '/my-tools', label: 'My AI Tools', desc: 'The AI tools you use day to day' },
  { href: '/calibration', label: 'My Calibration', desc: 'Retake the assessment that tunes your lessons' },
  { href: '/my-impact', label: 'My Impact', desc: 'How AI is changing your work over time' },
  { href: '/profile', label: 'My Profile', desc: 'Your name, avatar, and preferences' },
  { href: '/projects', label: 'My Projects', desc: 'Projects you are learning AI for' },
  { href: '/my-role', label: 'My Role', desc: 'Your role and department' },
  { href: '/my-tasks', label: 'My Tasks', desc: 'The tasks you do with AI' },
];

export const PROFILE_ITEM_HREFS = PROFILE_CATALOG.map((i) => i.href);
