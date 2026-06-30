// Single source of truth for the *toggleable* parts of the left-nav menu.
//
// This is plain, serializable data (no React/icon imports) so it can be shared
// by the sidebar (which attaches icons locally), the admin "Menu Visibility"
// page, and the server-side validation in lib/menu-visibility.js — none of them
// can drift out of sync because they all read this one list.
//
// Settings and Admin are intentionally NOT here: they are always visible so an
// admin can never lock themselves (or anyone) out of the controls.

export const MENU_CATALOG = [
  {
    title: 'Learn',
    items: [
      { href: '/discover', label: 'Discovery', desc: 'Find AI for your work' },
      { href: '/library', label: 'Library', desc: 'Browse ready-to-use AI use cases' },
      { href: '/games', label: 'Games', desc: 'Learn AI through quick interactive games' },
      { href: '/chat', label: 'Just Chat', desc: 'Ask anything about AI — it can launch a lesson' },
      { href: '/lesson', label: 'Lesson', desc: 'Pick a topic and depth for a guided lesson' },
      { href: '/prompts', label: 'Prompts', desc: 'Ready-to-use prompts for your tasks' },
      { href: '/daily', label: "Today's Pick", desc: 'Your personalized lesson for today' },
    ],
  },
  {
    title: 'HCP Skill Shop',
    items: [
      { href: 'https://housecallpro.docebosaas.com/pages/183/ai-resources-home-page', label: 'AI Resources Home', desc: 'Explore the AI Learning Library, Coaching Agents, tool guides (ChatGPT, Claude, Gemini) & real-world AI uses' },
      { href: 'https://housecallpro.docebosaas.com/pages/214/ai-self-guided-journey-beginner', label: 'Level 1 — Beginner', desc: 'What it is, how it works & prompting basics' },
      { href: 'https://housecallpro.docebosaas.com/pages/217/ai-self-guided-journey-level-2', label: 'Level 2 — Intermediate', desc: 'AI tool settings, custom agents & data visualizations' },
      { href: 'https://housecallpro.docebosaas.com/pages/218/ai-self-guided-journey-level-3', label: 'Level 3 — Advanced', desc: 'Workflow optimization, automation & data analysis' },
    ],
  },
  {
    title: 'Your Progress',
    items: [
      { href: '/achievements', label: 'Achievements', desc: 'Badges and milestones you have earned' },
      { href: '/calibration', label: 'Calibrate', desc: 'Tune lessons to your current level' },
      { href: '/heatmap', label: 'Knowledge Heatmap', desc: 'Where you are strong and where to grow' },
      { href: '/leaderboard', label: 'Leaderboard', desc: 'See how you rank across your team' },
    ],
  },
  {
    title: 'Manager',
    items: [
      { href: '/manager', label: 'Team Dashboard', desc: 'Team learning dashboard for managers' },
      { href: '/reporting', label: 'Reporting', desc: 'Org-wide learning activity and progress' },
    ],
  },
];

// Flat lists / lookups derived once from the catalog.
export const CATALOG_SECTION_TITLES = MENU_CATALOG.map(s => s.title);

export const CATALOG_ITEM_HREFS = MENU_CATALOG.flatMap(s => s.items.map(i => i.href));

// href -> the title of the section that contains it.
export const ITEM_SECTION_BY_HREF = Object.fromEntries(
  MENU_CATALOG.flatMap(s => s.items.map(i => [i.href, s.title])),
);

// Only internal (app) routes can be route-guarded; external Skill Shop links
// can be hidden in the menu but there is no page of ours to gate.
export const INTERNAL_ITEM_HREFS = CATALOG_ITEM_HREFS.filter(h => h.startsWith('/'));
