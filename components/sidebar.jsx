'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProfile } from '@/components/profile-provider';
import {
  Menu, X, BarChart3,
  CalendarDays, Play, GraduationCap,
  Grid3X3, Gamepad2, Award, MessageCircle,
  Compass, Trophy, BookOpen, Terminal, Home, Library,
  ExternalLink, TrendingUp,
  Settings, SlidersHorizontal, FileText, Bell, Users, Wrench, Sparkles,
} from 'lucide-react';
import { MenuThemeToggle } from '@/components/theme-toggle';
import VoicePicker from '@/components/voice-picker';
import { useTour } from '@/components/guided-tour-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { isCinematicRoute } from '@/lib/cinematic-routes';

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
      className="px-4 pt-5 pb-1 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
    >
      {title}
    </p>
  );
}

// A menu item's description shown as a styled hover popup. Absolutely positioned
// just below the row (constrained to the panel width) so it's visible without
// growing the row or reflowing the menu, and so it can't clip off the side. The
// parent row must be `relative` and `group`.
//
// Hover-only: it appears on hover after a short delay (so it doesn't flash while
// scanning the menu) and disappears immediately when the pointer leaves. It is
// intentionally NOT tied to focus — clicking a row used to leave the description
// stuck open (focus-within), which read as a bug.
function ItemDescPopup({ text }) {
  if (!text) return null;
  return (
    <span className="pointer-events-none absolute left-10 right-2 top-[calc(100%-0.25rem)] z-50 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs leading-snug px-3 py-2 shadow-xl opacity-0 invisible transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-hover:delay-500">
      {text}
    </span>
  );
}

export const NAV_SECTIONS = [
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
      { href: '/heatmap', icon: Grid3X3, label: 'Knowledge Heatmap', desc: 'Where you are strong and where to grow' },
      { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', desc: 'See how you rank across your team' },
    ],
  },
  {
    title: 'Manager',
    icon: BarChart3,
    tour: 'section-manager',
    items: [
      { href: '/manager', icon: BarChart3, label: 'Team Dashboard', desc: 'Team learning dashboard for managers' },
      { href: '/reporting', icon: FileText, label: 'Reporting', desc: 'Org-wide learning activity and progress' },
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
export const ADMIN_ITEMS = [
  { href: '/admin', icon: Settings, label: 'Admin Dashboard', desc: 'People & XP, content, settings — all admin tools' },
];

export const SKILL_SHOP_LINKS = [
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
  return pathname.startsWith('/onboarding')
    || pathname.startsWith('/auth')
    || pathname.startsWith('/reporting/shared'); // public, no-login shared report
}

const SidebarContext = createContext(null);

const SIDEBAR_KEY = 'sidebar_open';

export function SidebarProvider({ children }) {
  // Open by default and persisted. The menu stays open across reloads and
  // navigation; once the user opens or closes it we remember that choice in
  // localStorage and stop auto-managing it. The one exception is the first-run
  // onboarding welcome — we keep the menu closed while that card is up so it
  // doesn't compete for attention. Starts closed for SSR so the first client
  // render matches the server; the effects below settle the real state right
  // after mount (the panel slides in via its transform transition).
  const [open, setOpenState] = useState(true);
  const pathname = usePathname();
  const profileCtx = useProfile();
  const profile = profileCtx?.profile;

  // Once the user makes an explicit choice (or we restore a saved one), the
  // auto-default effect stops touching the menu.
  const userDecidedRef = useRef(false);

  // Setter for explicit user actions (hamburger, ✕, backdrop, Escape) — it
  // records the choice so it persists and isn't overridden by the default.
  const setOpen = useCallback((next) => {
    userDecidedRef.current = true;
    setOpenState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem(SIDEBAR_KEY, value ? 'true' : 'false'); } catch {}
      return value;
    });
  }, []);

  // Restore a saved choice on mount, if there is one.
  useEffect(() => {
    let stored = null;
    try { stored = localStorage.getItem(SIDEBAR_KEY); } catch {}
    if (stored === 'true' || stored === 'false') {
      userDecidedRef.current = true;
      setOpenState(stored === 'true');
    }
  }, []);

  // Default-open behavior, active only until the user decides for themselves:
  // open everywhere, EXCEPT while the first-run onboarding welcome card is
  // showing (a profile exists but the tour was never offered) — keep it closed
  // then. Re-runs when onboarding completes (tour_offered flips true), so the
  // menu opens once the welcome is dismissed.
  useEffect(() => {
    if (userDecidedRef.current) return;
    const onboardingWelcome = pathname === '/' && profile && profile.tour_offered === false;
    setOpenState(!onboardingWelcome);
  }, [pathname, profile]);

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setOpen]);

  // Mark the document while the menu is open so the top bar can hold its
  // full width while the body shifts, and the hamburger strip can hide
  // (see `.js-topbar` / `.js-menu-strip` in globals.css). The open/close is
  // instant (no transition) so the top bar's full-width counter-shift lands in
  // a single frame — it can never wobble or flash a white gap mid-animation.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('menu-open', open);
    return () => root.classList.remove('menu-open');
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle: () => setOpen(p => !p) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

// A thin white toolbar strip just below the dark top bar that holds the
// hamburger. It spans the page (so it never sits on top of content) and hides
// while the menu is open — the open panel and its ✕ take over from there.
export function MenuStrip() {
  const { open, toggle } = useSidebar();
  const pathname = usePathname();
  if (isChromeHiddenRoute(pathname)) return null;
  // Reskinned routes (cinematic) provide their own top bar + drawer, so the
  // shared chrome would duplicate there.
  if (isCinematicRoute(pathname)) return null;
  return (
    <div className="js-menu-strip fixed top-16 left-0 right-0 z-30 h-11 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 flex items-center px-4">
      <button
        onClick={toggle}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
    </div>
  );
}

// Wraps page content. On large screens the menu is docked: content shifts right
// to sit beside the panel (no dimming) and stays fully visible/clickable, and
// the menu stays open until the user closes it. On small screens the panel is
// too wide to push content, so it overlays with a dim backdrop you can tap to
// close.
export function SidebarShell({ children }) {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();
  // No nav on onboarding/auth — don't shift content or show the backdrop there.
  const chromeHidden = isChromeHiddenRoute(pathname);
  const cinematic = isCinematicRoute(pathname);
  const showNav = open && !chromeHidden && !cinematic;
  return (
    <>
      {/* Small screens only: dim + tap-to-close (the panel overlays content). */}
      {showNav && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* pt-16 clears the fixed top bar (it no longer occupies flow space like
          the old sticky header did). Skipped on chrome-hidden full-screen flows
          (onboarding/auth) that have no top bar — and on cinematic routes, which
          render their own in-flow top bar inside the cinematic shell. Applying
          pt-16 there pushed the whole cinematic frame down 64px, leaving a white
          strip up top and letting the fixed drawer (top-16) overlap the pushed-
          down cinematic top bar. */}
      <div className={`${chromeHidden || cinematic ? '' : 'pt-16'} ${showNav ? 'lg:pl-80' : ''}`}>
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
  const {
    isAdmin, actingAsAdmin, isManager,
    isSectionHidden, isSectionComingSoon,
    isItemHidden, isItemComingSoon,
  } = useMenuVisibility();

  // The app nav shouldn't appear during onboarding or auth — those are
  // full-screen flows with no menu until the user is set up. Cinematic routes
  // render their own drawer.
  if (isChromeHiddenRoute(pathname)) return null;
  if (isCinematicRoute(pathname)) return null;

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
        data-tour={navItemTour(item.href)}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 px-4 py-2 border-l-2 transition-colors ${
          active
            ? 'border-brand bg-brand-50 dark:bg-brand-900/20 text-brand'
            : 'border-transparent text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
      >
        <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="min-w-0 block text-sm font-medium leading-tight truncate">{item.label}</span>
        <ItemDescPopup text={item.desc} />
      </Link>
    );
  }

  return (
    <nav
      data-tour="sidebar"
      className={`fixed top-16 left-0 h-[calc(100dvh-4rem)] w-80 max-w-[88vw] z-[45] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl overflow-y-auto ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-hidden={!open}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between z-10">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu</p>
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
          {/* The Manager section is only for people-managers (direct reports)
              and admins — everyone else never sees it. Uses actingAsAdmin so an
              admin "viewing as a regular user" without direct reports sees it
              disappear too. */}
          {(section.title !== 'Manager' || actingAsAdmin || isManager) && !isSectionHidden(section.title) && (
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
                  data-tour="nav-tour"
                  className="group relative w-full flex items-center gap-3 px-4 py-2 border-l-2 border-transparent text-left text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <item.icon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span className="min-w-0 block text-sm font-medium leading-tight truncate">{item.label}</span>
                  <ItemDescPopup text={item.desc} />
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
                  className="group relative flex items-center gap-3 px-4 py-2 text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="min-w-0 block text-sm font-medium leading-tight truncate">{link.label}</span>
                  <ItemDescPopup text={link.desc} />
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
