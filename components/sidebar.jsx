'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu, X, Crosshair, GitBranch, BarChart3, PenTool,
  CalendarDays, Play, GraduationCap, Lightbulb, ClipboardCheck,
  Target, Grid3X3, Gamepad2, Award, MessageCircle, CalendarCheck,
  Compass, Trophy, BookOpen, Library, User, FolderKanban, Terminal,
  Rocket, RefreshCw, ExternalLink, Store,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Learn',
    items: [
      { href: '/chat', icon: MessageCircle, label: 'Just Chat' },
      { href: '/lesson', icon: BookOpen, label: 'Lesson' },
      { href: '/modules', icon: GraduationCap, label: 'Modules' },
      { href: '/structured-lesson', icon: PenTool, label: 'Practice' },
      { href: '/library', icon: Library, label: 'Library' },
      { href: '/daily', icon: CalendarDays, label: 'Daily' },
      { href: '/discover', icon: Compass, label: 'Discover' },
      { href: '/quick-win', icon: Lightbulb, label: 'Quick Win' },
      { href: '/prompts', icon: Terminal, label: 'Prompts' },
      { href: '/games', icon: Gamepad2, label: 'Games' },
    ],
  },
  {
    title: 'Your Progress',
    items: [
      { href: '/goals', icon: Target, label: 'Goals' },
      { href: '/quests', icon: Rocket, label: 'Quests' },
      { href: '/achievements', icon: Award, label: 'Achievements' },
      { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { href: '/heatmap', icon: Grid3X3, label: 'Knowledge Heatmap' },
      { href: '/skill-graph', icon: GitBranch, label: 'Skill Graph' },
      { href: '/scoring', icon: ClipboardCheck, label: 'AI Impact' },
      { href: '/review', icon: RefreshCw, label: 'Review' },
      { href: '/checkin', icon: CalendarCheck, label: 'Check-in' },
      { href: '/calibration', icon: Crosshair, label: 'Calibrate' },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/profile', icon: User, label: 'Profile' },
      { href: '/projects', icon: FolderKanban, label: 'Projects' },
      { href: '/manager', icon: BarChart3, label: 'Manager' },
      { href: '/tour', icon: Play, label: 'Tour' },
    ],
  },
];

const SKILL_SHOP_LINKS = [
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
          <p className="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {section.title}
          </p>
          {section.items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <item.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      {/* HCP Skill Shop — external courses */}
      <div className="py-1 border-t border-slate-100 dark:border-slate-700 mt-1 mb-2">
        <div className="px-4 pt-2 pb-1 flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-brand" />
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            HCP Skill Shop
          </p>
        </div>
        <p className="px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">
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
