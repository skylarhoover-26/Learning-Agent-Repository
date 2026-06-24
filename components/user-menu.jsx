'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Home, ChevronDown, User, UserCog, Briefcase, FolderKanban, LogOut, PanelsTopLeft, Eye, Shield, Bell, PlayCircle } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { listPausedLessons, relativeAccessTime, absoluteAccessDate } from '@/lib/paused-lessons';
import Avatar from '@/components/avatar';
import { useChampions } from '@/components/champion-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { displayNameFromProfile } from '@/lib/display-name';

// Profile-related links that live under the name dropdown (everything that used
// to be in the sidebar's "Account" section except Manager, which stays in the menu).
// `tour` anchors let the guided tour spotlight each item with the dropdown open.
const PROFILE_LINKS = [
  { href: '/profile', icon: User, label: 'Profile', tour: 'nav-profile' },
  { href: '/my-role', icon: UserCog, label: 'My Role', tour: 'nav-my-role' },
  { href: '/my-tools', icon: PanelsTopLeft, label: 'My AI Tools', tour: 'nav-my-tools' },
  { href: '/my-tasks', icon: Briefcase, label: 'My Tasks', tour: 'nav-my-tasks' },
  { href: '/projects', icon: FolderKanban, label: 'Projects', tour: 'nav-projects' },
];

// Top-right header cluster: a persistent "Home" link (always reachable without
// opening the menu) + a name dropdown with profile items and session actions.
export default function UserMenu() {
  const { profile } = useProfile();
  const { championIds } = useChampions();
  const { isAdmin, previewAsUser, setPreviewAsUser } = useMenuVisibility();
  const displayName = displayNameFromProfile(profile);
  const isChampion = profile ? championIds.has(resolveLearnerId(profile)) : false;

  // Okta drives identity once it's configured; until then the "session" is the
  // IdentityGate soft-login cookie, which NextAuth's signOut doesn't touch.
  const oktaConfigured = !!process.env.NEXT_PUBLIC_OKTA_CONFIGURED;

  const [open, setOpen] = useState(false);

  // Count of unfinished ("paused") lessons, surfaced as a bell badge + a menu
  // shortcut. Reads localStorage, and refreshes whenever a lesson is paused or
  // resumed (custom event) or the tab regains focus.
  const [pausedCount, setPausedCount] = useState(0);
  const [pausedLatest, setPausedLatest] = useState(null);
  useEffect(() => {
    const refresh = () => {
      try {
        const list = listPausedLessons();
        setPausedCount(list.length);
        // listPausedLessons() is sorted most-recently-opened first.
        setPausedLatest(list[0]?.lastAccessedAt || null);
      } catch { setPausedCount(0); setPausedLatest(null); }
    };
    refresh();
    window.addEventListener('paused-lessons:changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('paused-lessons:changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    if (oktaConfigured) {
      // Real SSO session — let NextAuth end it and bounce to the sign-in page.
      signOut({ callbackUrl: '/auth/signin' });
      return;
    }
    // Pre-Okta soft login: clear ONLY the identity cookie, then hard-reload so
    // the IdentityGate reappears. We must NOT touch the lp_*/learner_* progress
    // keys — they're namespaced per learner id, so a different tester is already
    // isolated, and wiping them destroys the local XP log. That made the
    // idempotent first-login bonus re-fire (+25 XP) and desynced the learner's
    // total from the server-backed leaderboard.
    try {
      await fetch('/api/identity', { method: 'DELETE' });
    } catch {
      /* never block logout on a failed clear */
    }
    window.location.href = '/';
  }
  // When the guided tour drives the dropdown, we keep it open and ignore the
  // outside-click handler (the tour's Next/Close buttons live outside it).
  const [tourControlled, setTourControlled] = useState(false);
  const wrapRef = useRef(null);

  // The guided tour opens/closes this dropdown so it can highlight the items.
  useEffect(() => {
    function onTour(e) {
      if (e.detail === 'open') { setTourControlled(true); setOpen(true); }
      else { setTourControlled(false); setOpen(false); }
    }
    window.addEventListener('tour:user-menu', onTour);
    return () => window.removeEventListener('tour:user-menu', onTour);
  }, []);

  // Close on outside click or Escape — disabled while the tour is in control.
  useEffect(() => {
    if (!open || tourControlled) return;
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, tourControlled]);

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        data-tour="home-link"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-all"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {pausedCount > 0 && (
        <Link
          href="/lesson#paused-lessons"
          aria-label={`${pausedCount} unfinished ${pausedCount === 1 ? 'lesson' : 'lessons'} — resume`}
          title={`${pausedCount} unfinished ${pausedCount === 1 ? 'lesson' : 'lessons'}`}
          className="relative flex items-center justify-center w-9 h-9 rounded-pill text-white/90 hover:text-white hover:bg-white/10 transition-all"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold flex items-center justify-center">
            {pausedCount}
          </span>
        </Link>
      )}

      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen(p => !p)}
          data-tour="name-menu"
          className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-pill text-sm text-white/90 hover:bg-white/10 transition-all"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="hidden sm:inline">{displayName}</span>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden">
            <Avatar avatar={profile?.avatar} size={32} crown={isChampion} title={displayName} />
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50"
          >
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-ink dark:text-slate-200 truncate">{displayName}</p>
            </div>
            {pausedCount > 0 && (
              <Link
                href="/lesson#paused-lessons"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <PlayCircle className="w-4 h-4 shrink-0 text-brand" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-brand">Resume lessons</span>
                    {pausedLatest && (
                      <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
                        Last opened {relativeAccessTime(pausedLatest)} · {absoluteAccessDate(pausedLatest)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-xs font-bold flex items-center justify-center shrink-0">
                  {pausedCount}
                </span>
              </Link>
            )}
            {PROFILE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                data-tour={link.tour}
                className="flex items-center gap-3 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <link.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => { setPreviewAsUser(!previewAsUser); setOpen(false); }}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  {previewAsUser ? (
                    <>
                      <Shield className="w-4 h-4 text-brand shrink-0" />
                      Back to admin view
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      Preview as user
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
