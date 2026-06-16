'use client';

import { createContext, useContext, useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Crosshair, GitBranch, BarChart3, PenTool,
  CalendarDays, Play, GraduationCap, ClipboardCheck,
  Target, Grid3X3, Gamepad2, Award, MessageCircle, CalendarCheck,
  Compass, Trophy, BookOpen, Library, Terminal,
  Rocket, RefreshCw, ExternalLink, Store, TrendingUp,
  Shield, Settings, SlidersHorizontal, FileText, Bell, Users,
} from 'lucide-react';
import { MenuThemeToggle } from '@/components/theme-toggle';
import VoicePicker from '@/components/voice-picker';
import { useTour } from '@/components/guided-tour-provider';

// Stable tour anchor for a nav item, derived from its href so the sidebar and
// the guided-tour step list stay in sync (e.g. '/my-tasks' -> 'nav-my-tasks').
function navItemTour(href) {
  return 'nav' + href.replace(/\//g, '-');
}

// Section header styled like the dashboard's "Find something to learn":
// an icon, a bold label, and a thin divider line.
function SectionHeader({ icon: Icon, title, tour }) {
  return (
    <div className="relative px-4 py-2 mt-1" data-tour={tour}>
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
    tour: 'section-learn',
    items: [
      { href: '/daily', icon: CalendarDays, label: 'Daily', desc: 'A fresh bite-sized lesson each day', tour: 'nav-daily' },
      { href: '/discover', icon: Compass, label: 'Discover', desc: 'Find AI opportunities for your real work', tour: 'nav-discover' },
      { href: '/games', icon: Gamepad2, label: 'Games', desc: 'Learn AI through quick interactive games' },
      { href: '/chat', icon: MessageCircle, label: 'Just Chat', desc: 'Ask anything about AI — it can launch a lesson', tour: 'nav-chat' },
      { href: '/lesson', icon: BookOpen, label: 'Lesson', desc: 'Pick a topic and depth for a guided lesson' },
      { href: '/library', icon: Library, label: 'Library', desc: 'Browse saved AI resources and references' },
      { href: '/modules', icon: GraduationCap, label: 'Modules', desc: 'Structured, multi-lesson learning paths' },
      { href: '/structured-lesson', icon: PenTool, label: 'Practice', desc: 'Hands-on exercises with instant feedback' },
      { href: '/prompts', icon: Terminal, label: 'Prompts', desc: 'Ready-to-use prompts for your tasks' },
    ],
  },
  {
    title: 'Your Progress',
    icon: TrendingUp,
    tour: 'section-progress',
    items: [
      { href: '/achievements', icon: Award, label: 'Achievements', desc: 'Badges and milestones you have earned' },
      { href: '/scoring', icon: ClipboardCheck, label: 'AI Impact', desc: 'Measure how AI is helping your work' },
      { href: '/calibration', icon: Crosshair, label: 'Calibrate', desc: 'Tune lessons to your current level' },
      { href: '/checkin', icon: CalendarCheck, label: 'Check-in', desc: 'A quick pulse on your progress' },
      { href: '/goals', icon: Target, label: 'Goals', desc: 'Set and track your learning goals' },
      { href: '/heatmap', icon: Grid3X3, label: 'Knowledge Heatmap', desc: 'Where you are strong and where to grow' },
      { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', desc: 'See how you rank across your team' },
      { href: '/quests', icon: Rocket, label: 'Quests', desc: 'Build something real, start to finish' },
      { href: '/review', icon: RefreshCw, label: 'Review', desc: 'Revisit key concepts so they stick' },
      { href: '/skill-graph', icon: GitBranch, label: 'Skill Graph', desc: 'A visual map of your AI skills' },
    ],
  },
  {
    title: 'Manager',
    icon: BarChart3,
    tour: 'section-manager',
    items: [
      { href: '/manager', icon: BarChart3, label: 'Team Dashboard', desc: 'Team learning dashboard for managers' },
    ],
  },
  {
    title: 'Settings',
    icon: Settings,
    tour: 'section-settings',
    items: [
      { themeToggle: true },
      { walkthrough: true, icon: Play, label: 'Tour', desc: 'Replay the guided walkthrough of the app' },
      { voicePicker: true },
    ],
  },
];

// Shown only to admins, pinned to the top of the nav.
const ADMIN_ITEMS = [
  { href: '/admin', icon: Settings, label: 'Admin Dashboard', desc: 'Curriculum proposals and admin tools' },
  { href: '/admin/admins', icon: Users, label: 'Admins', desc: 'Manage who has admin access' },
  { href: '/curriculum-pipeline', icon: FileText, label: 'Content Updates', desc: 'Review AI-proposed curriculum updates' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications', desc: 'Who receives Slack notifications' },
  { href: '/admin/skill-levels', icon: SlidersHorizontal, label: 'Skill Levels', desc: "Set each skill's difficulty level" },
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
      data-tour="menu-toggle"
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
  const { startTour } = useTour();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/admin-check').then(r => r.json()).then(d => setIsAdmin(!!d.isAdmin)).catch(() => {});
  }, []);

  // Highlight only the single most-specific matching item. Without this, a
  // parent like /admin would also light up on /admin/skill-levels. We pick the
  // longest href that matches the current path (exact or as a path prefix).
  const allHrefs = [
    ...ADMIN_ITEMS.map(i => i.href),
    ...NAV_SECTIONS.flatMap(s => s.items.filter(i => i.href).map(i => i.href)),
  ];
  function pathMatches(href) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  }
  const activeHref = allHrefs
    .filter(pathMatches)
    .sort((a, b) => b.length - a.length)[0] || null;
  function isActive(href) {
    return href === activeHref;
  }

  function renderNavItem(item) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        data-tour={navItemTour(item.href)}
        aria-current={active ? 'page' : undefined}
        className={`flex items-start gap-3 px-4 py-2 border-l-2 transition-colors ${
          active
            ? 'border-brand bg-brand-50 dark:bg-brand-900/20 text-brand'
            : 'border-transparent text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`} />
        <span>
          <span className="block text-sm font-semibold">{item.label}</span>
          <span className={`block text-xs leading-snug ${active ? 'text-brand/70' : 'text-slate-500 dark:text-slate-400'}`}>{item.desc}</span>
        </span>
      </Link>
    );
  }

  return (
    <nav
      data-tour="sidebar"
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

      {isAdmin && (
        <div className="py-1">
          <SectionHeader icon={Shield} title="Admin" tour="section-admin" />
          {ADMIN_ITEMS.map(renderNavItem)}
        </div>
      )}

      {NAV_SECTIONS.map(section => (
        <Fragment key={section.title}>
          <div className="py-1">
            <SectionHeader icon={section.icon} title={section.title} tour={section.tour} />
            {section.items.map(item => (
              item.themeToggle ? (
                <div key="theme" data-tour="dark-mode">
                  <MenuThemeToggle />
                </div>
              ) : item.voicePicker ? (
                <div key="voice" data-tour="nav-voice">
                  <VoicePicker />
                </div>
              ) : item.walkthrough ? (
                <button
                  key="tour"
                  onClick={startTour}
                  data-tour="nav-tour"
                  className="w-full flex items-start gap-3 px-4 py-2 border-l-2 border-transparent text-left text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <item.icon className="w-4 h-4 mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">{item.desc}</span>
                  </span>
                </button>
              ) : (
                renderNavItem(item)
              )
            ))}
          </div>
          {/* HCP Skill Shop sits right under Learn — it's external learning content. */}
          {section.title === 'Learn' && (
            <div className="py-1">
              <SectionHeader icon={Store} title="HCP Skill Shop" tour="section-skillshop" />
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
          )}
        </Fragment>
      ))}

    </nav>
  );
}
