'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu, X, Crosshair, GitBranch, BarChart3, PenTool,
  CalendarDays, Play, GraduationCap, Lightbulb, ClipboardCheck,
  Target, Grid3X3, Gamepad2, Award, MessageCircle, CalendarCheck,
  Compass, Trophy, BookOpen, Library, User, FolderKanban, Terminal,
  Rocket, RefreshCw, ExternalLink, Store, TrendingUp, UserCog, Briefcase,
} from 'lucide-react';

// Section header styled like the dashboard's "Find something to learn":
// an icon, a bold label, and a thin divider line.
function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="relative px-4 py-2 mt-1">
      <div className="absolute inset-0 px-4 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200 dark:border-slate-700" />
      </div>
      <div className="relative flex justify-start">
        <span className="bg-white dark:bg-slate-800 pr-3 flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand" />
          <span className="text-sm font-semibold text-ink dark:text-slate-200">{title}</span>
        </span>
      </div>
    </div>
  );
}

const NAV_SECTIONS = [
  {
    title: 'Learn',
    icon: BookOpen,
    items: [
      { href: '/chat', icon: MessageCircle, label: 'Just Chat', desc: 'Ask anything about AI — it can launch a lesson' },
      { href: '/lesson', icon: BookOpen, label: 'Lesson', desc: 'Pick a topic and depth for a guided lesson' },
      { href: '/modules', icon: GraduationCap, label: 'Modules', desc: 'Structured, multi-lesson learning paths' },
      { href: '/structured-lesson', icon: PenTool, label: 'Practice', desc: 'Hands-on exercises with instant feedback' },
      { href: '/library', icon: Library, label: 'Library', desc: 'Browse saved AI resources and references' },
      { href: '/daily', icon: CalendarDays, label: 'Daily', desc: 'A fresh bite-sized lesson each day' },
      { href: '/discover', icon: Compass, label: 'Discover', desc: 'Find AI opportunities for your real work' },
      { href: '/quick-win', icon: Lightbulb, label: 'Quick Win', desc: 'A fast, practical AI task you can use now' },
      { href: '/prompts', icon: Terminal, label: 'Prompts', desc: 'Ready-to-use prompts for your tasks' },
      { href: '/games', icon: Gamepad2, label: 'Games', desc: 'Learn AI through quick interactive games' },
    ],
  },
  {
    title: 'Your Progress',
    icon: TrendingUp,
    items: [
      { href: '/goals', icon: Target, label: 'Goals', desc: 'Set and track your learning goals' },
      { href: '/quests', icon: Rocket, label: 'Quests', desc: 'Build something real, start to finish' },
      { href: '/achievements', icon: Award, label: 'Achievements', desc: 'Badges and milestones you have earned' },
      { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', desc: 'See how you rank across your team' },
      { href: '/heatmap', icon: Grid3X3, label: 'Knowledge Heatmap', desc: 'Where you are strong and where to grow' },
      { href: '/skill-graph', icon: GitBranch, label: 'Skill Graph', desc: 'A visual map of your AI skills' },
      { href: '/scoring', icon: ClipboardCheck, label: 'AI Impact', desc: 'Measure how AI is helping your work' },
      { href: '/review', icon: RefreshCw, label: 'Review', desc: 'Revisit key concepts so they stick' },
      { href: '/checkin', icon: CalendarCheck, label: 'Check-in', desc: 'A quick pulse on your progress' },
      { href: '/calibration', icon: Crosshair, label: 'Calibrate', desc: 'Tune lessons to your current level' },
    ],
  },
  {
    title: 'Account',
    icon: User,
    items: [
      { href: '/profile', icon: User, label: 'Profile', desc: 'Your name, settings, and reset options' },
      { href: '/my-role', icon: UserCog, label: 'My Role', desc: 'Change your department, team, or tasks' },
      { href: '/my-tasks', icon: Briefcase, label: 'My Tasks', desc: 'Manage your day-to-day tasks' },
      { href: '/projects', icon: FolderKanban, label: 'Projects', desc: 'Add work projects to tailor lessons' },
      { href: '/manager', icon: BarChart3, label: 'Manager', desc: 'Team learning dashboard for managers' },
      { href: '/tour', icon: Play, label: 'Tour', desc: 'A guided walkthrough of the platform' },
    ],
  },
];

const SKILL_SHOP_LINKS = [
  {
    href: 'https://housecallpro.docebosaas.com/pages/183/ai-resources-home-page',
    label: 'AI Resources Home',
    desc: 'Explore the AI Learning Library, Coaching Agents, tool guides (ChatGPT, Claude, Gemini) & real-world AI uses',
  },
  {
    href: 'https://housecallpro.docebosaas.com/pages/214/ai-self-guided-journey-beginner',
    label: 'Level 1 — Beginner',
    desc: 'What it is, how it works & prompting basics',
  },
  {
    href: 'https://housecallpro.docebosaas.com/pages/217/ai-self-guided-journey-level-2',
    label: 'Level 2 — Intermediate',
    desc: 'AI tool settings, custom agents & data visualizations',
  },
  {
    href: 'https://housecallpro.docebosaas.com/pages/218/ai-self-guided-journey-level-3',
    label: 'Level 3 — Advanced',
    desc: 'Workflow optimization, automation & data analysis',
  },
];

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  // Always open by default on load. It stays open as you navigate within a
  // session and you can close it anytime, but a fresh load/login starts open
  // (we intentionally do NOT persist a closed state across sessions).
  const [open, setOpen] = useState(true);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle: () => setOpen(p => !p) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

// Hamburger button — lives in the page header and toggles the sidebar.
// Always shows the menu icon; the sidebar's own X handles closing, so we avoid
// a confusing double-X when the sidebar is open.
export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
      aria-label="Navigation menu"
      aria-expanded={open}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

// Wraps page content; shifts it right of the rail on large screens when open.
export function SidebarShell({ children }) {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Backdrop on small screens only — desktop keeps the rail persistent. */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className={`transition-[padding] duration-200 ${open ? 'lg:pl-72' : ''}`}>
        {children}
      </div>
    </>
  );
}

// The docked, full-height left navigation rail.
export function SideNav() {
  const { open, setOpen } = useSidebar();
  return (
    <nav
      className={`fixed top-0 left-0 h-screen w-72 z-50 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between z-10">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu</p>
        <button
          onClick={() => setOpen(false)}
          className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {NAV_SECTIONS.map(section => (
        <div key={section.title} className="py-1">
          <SectionHeader icon={section.icon} title={section.title} />
          {section.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 px-4 py-2 text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <item.icon className="w-4 h-4 mt-0.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      ))}

      {/* HCP Skill Shop — external courses */}
      <div className="py-1 mb-2">
        <SectionHeader icon={Store} title="HCP Skill Shop" />
        <p className="px-4 pb-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
          Want to learn more about AI? Explore the self-guided journey:
        </p>
        {SKILL_SHOP_LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mt-0.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span>
              <span className="block font-medium">{link.label}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{link.desc}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
