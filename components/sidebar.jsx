'use client';

import { createContext, useContext, useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Crosshair, GitBranch, BarChart3, PenTool,
  CalendarDays, Play, GraduationCap, ClipboardCheck,
  Target, Grid3X3, Gamepad2, Award, MessageCircle, CalendarCheck,
  Compass, Trophy, BookOpen, Terminal, Home, Library,
  Rocket, RefreshCw, ExternalLink, TrendingUp,
  Settings, SlidersHorizontal, FileText, Bell, Users, Wrench, Sparkles,
} from 'lucide-react';
import { MenuThemeToggle } from '@/components/theme-toggle';
import VoicePicker from '@/components/voice-picker';
import { useTour } from '@/components/guided-tour-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';

// Stable tour anchor for a nav item, derived from its href so the sidebar and
// the guided-tour step list stay in sync (e.g. '/my-tasks' -> 'nav-my-tasks').
function navItemTour(href) {
  return 'nav' + href.replace(/\//g, '-');
}

// A quiet, uppercase group label — no divider line, no icon, no chevron — so
// the eye scans the items, not the headers (matches the reference design).
function SectionHeader({ title, tour }) {
  return (
    <p
      data-tour={tour}
      className="px-4 pt-5 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
    >
      {title}
    </p>
  );
}

const NAV_SECTIONS = [
  {
    title: 'Learn',
    icon: BookOpen,
    tour: 'section-learn',
    items: [
      { href: '/discover', icon: Compass, label: 'Discovery', desc: 'Find AI for your work', tour: 'nav-discover' },
      { href: '/library', icon: Library, label: 'Library', desc: 'Browse ready-to-use AI use cases', tour: 'nav-library' },
      { href: '/games', icon: Gamepad2, label: 'Games', desc: 'Learn AI through quick interactive games' },
      { href: '/chat', icon: MessageCircle, label: 'Just Chat', desc: 'Ask anything about AI — it can launch a lesson', tour: 'nav-chat' },
      { href: '/lesson', icon: BookOpen, label: 'Lesson', desc: 'Pick a topic and depth for a guided lesson' },
      { href: '/structured-lesson', icon: PenTool, label: 'Practice', desc: 'Hands-on exercises with instant feedback' },
      { href: '/prompts', icon: Terminal, label: 'Prompts', desc: 'Ready-to-use prompts for your tasks' },
      { href: '/daily', icon: Sparkles, label: "Today's Pick", desc: 'Your personalized lesson for today', tour: 'nav-daily' },
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

// Shown only to admins. Everything now lives behind the Admin Dashboard hub, so
// the sidebar keeps a single entry instead of a long list.
const ADMIN_ITEMS = [
  { href: '/admin', icon: Settings, label: 'Admin Dashboard', desc: 'People & XP, content, settings — all admin tools' },
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

// Routes that are full-screen flows with no app chrome (nav rail / content
// shift) until the user is set up.
function isChromeHiddenRoute(pathname) {
  return pathname.startsWith('/onboarding') || pathname.startsWith('/auth');
}

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  // Closed by default: the menu is an overlay (Amazon-style) that slides over
  // the page on top of a dimmed backdrop, so it starts closed and opens on the
  // hamburger — leaving it open by default would dim every page on load.
  const [open, setOpen] = useState(false);

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

// Hamburger button — lives in the page header and opens the overlay menu.
// While the menu is open it overlays the page and has its own ✕ to close, so we
// hide the hamburger — but keep its w-9 h-9 footprint as an invisible spacer so
// the header title doesn't jump when the icon disappears.
export function SidebarToggle() {
  const { open, toggle } = useSidebar();
  if (open) return <span className="w-9 h-9 shrink-0" aria-hidden="true" />;
  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-100"
      aria-label="Navigation menu"
      aria-expanded={open}
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

// Wraps page content. The menu is an overlay, so content never shifts — it
// stays centered in place and the panel slides over it on top of a backdrop.
export function SidebarShell({ children }) {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();
  // No nav on onboarding/auth — don't show the backdrop there.
  const showNav = open && !isChromeHiddenRoute(pathname);
  return (
    <>
      {/* Dimmed backdrop across the whole screen (all sizes) — click to close. */}
      {showNav && (
        <div
          className="fixed inset-0 bg-black/40 z-[55]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {children}
    </>
  );
}

// The docked, full-height left navigation rail.
export function SideNav() {
  const { open, setOpen } = useSidebar();
  const { startTour } = useTour();
  const pathname = usePathname();
  const {
    isAdmin,
    isSectionHidden, isSectionComingSoon,
    isItemHidden, isItemComingSoon,
  } = useMenuVisibility();

  // The app nav shouldn't appear during onboarding or auth — those are
  // full-screen flows with no menu until the user is set up.
  if (isChromeHiddenRoute(pathname)) return null;

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

  // A single greyed "Coming soon" line, used when a whole section is turned off
  // for non-admins. The section header stays; this replaces its items.
  function renderSectionComingSoon(title) {
    return (
      <div
        key={`${title}-coming-soon`}
        className="flex items-center gap-3 px-4 py-2 border-l-2 border-transparent text-slate-400 dark:text-slate-500 italic text-sm"
      >
        Coming soon
      </div>
    );
  }

  // A disabled item: shows the label but greyed and non-clickable, with a
  // "Coming soon" subtitle instead of its description.
  function renderDisabledItem(item) {
    return (
      <div
        key={item.href || item.label}
        aria-disabled="true"
        title="Coming soon"
        className="flex items-center gap-3 px-4 py-2 border-l-2 border-transparent text-slate-400 dark:text-slate-500 cursor-not-allowed select-none"
      >
        {item.icon && <item.icon className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />}
        <span className="text-sm font-medium italic">{item.label}</span>
      </div>
    );
  }

  function renderNavItem(item) {
    if (isItemHidden(item.href)) return null;
    if (isItemComingSoon(item.href)) return renderDisabledItem(item);
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.desc}
        data-tour={navItemTour(item.href)}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-2 border-l-2 transition-colors ${
          active
            ? 'border-brand bg-brand-50 dark:bg-brand-900/20 text-brand'
            : 'border-transparent text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    );
  }

  return (
    <nav
      data-tour="sidebar"
      className={`fixed top-0 left-0 h-screen w-96 max-w-[88vw] z-[56] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl overflow-y-auto transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between z-10">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu</p>
        <button
          onClick={() => setOpen(false)}
          data-tour="menu-toggle"
          className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Home — pinned at the very top so it's always one click away, in
          addition to the persistent Home link in the page header. */}
      <div className="pt-2 pb-1">
        <Link
          href="/"
          data-tour="nav-home"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`flex items-center gap-3 px-4 py-2 border-l-2 transition-colors ${
            pathname === '/'
              ? 'border-brand bg-brand-50 dark:bg-brand-900/20 text-brand'
              : 'border-transparent text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Home className={`w-4 h-4 shrink-0 ${pathname === '/' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`} />
          <span className="text-sm font-medium">Home</span>
        </Link>
      </div>

      {NAV_SECTIONS.map(section => (
        <Fragment key={section.title}>
          {!isSectionHidden(section.title) && (
          <div className="pb-1">
            <SectionHeader title={section.title} tour={section.tour} />
            {isSectionComingSoon(section.title)
              ? renderSectionComingSoon(section.title)
              : section.items.map(item => (
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
                  title={item.desc}
                  data-tour="nav-tour"
                  className="w-full flex items-center gap-3 px-4 py-2 border-l-2 border-transparent text-left text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <item.icon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ) : (
                renderNavItem(item)
              )
            ))}
          </div>
          )}
          {/* HCP Skill Shop sits right under Learn — it's external learning content. */}
          {section.title === 'Learn' && !isSectionHidden('HCP Skill Shop') && (
            <div className="pb-1">
              <SectionHeader title="HCP Skill Shop" tour="section-skillshop" />
              {isSectionComingSoon('HCP Skill Shop')
                ? renderSectionComingSoon('HCP Skill Shop')
                : SKILL_SHOP_LINKS.map(link => (
                isItemHidden(link.href) ? null : isItemComingSoon(link.href) ? (
                  renderDisabledItem({ href: link.href, label: link.label, icon: ExternalLink })
                ) : (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.desc}
                  className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>{link.label}</span>
                </a>
                )
              ))}
            </div>
          )}
        </Fragment>
      ))}

      {/* Admin lives at the bottom — it's not a daily-use section. */}
      {isAdmin && (
        <div className="pb-1">
          <SectionHeader title="Admin" tour="section-admin" />
          {ADMIN_ITEMS.map(renderNavItem)}
        </div>
      )}

    </nav>
  );
}
