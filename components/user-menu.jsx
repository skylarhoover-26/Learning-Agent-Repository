'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Home, ChevronDown, User, UserCog, Briefcase, FolderKanban, LogOut, PanelsTopLeft, Eye, Shield, BarChart3, Crosshair } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import PausedLessonsBell from '@/components/paused-lessons-bell';
import Avatar from '@/components/avatar';
import { useChampions } from '@/components/champion-provider';
import { useMenuVisibility } from '@/components/menu-visibility-provider';
import { resolveLearnerId } from '@/lib/learner-id';
import { displayNameFromProfile } from '@/lib/display-name';

// Profile-related links that live under the name dropdown (everything that used
// to be in the sidebar's "Account" section except Manager, which stays in the menu).
// `tour` anchors let the guided tour spotlight each item with the dropdown open.
// All "My …" for a consistent, personalized feel; kept alphabetical by label.
const PROFILE_LINKS = [
  { href: '/my-tools', icon: PanelsTopLeft, label: 'My AI Tools', tour: 'nav-my-tools' },
  { href: '/calibration', icon: Crosshair, label: 'My Calibration', tour: 'nav-my-calibration' },
  { href: '/my-impact', icon: BarChart3, label: 'My Impact' },
  { href: '/profile', icon: User, label: 'My Profile', tour: 'nav-profile' },
  { href: '/projects', icon: FolderKanban, label: 'My Projects', tour: 'nav-projects' },
  { href: '/my-role', icon: UserCog, label: 'My Role', tour: 'nav-my-role' },
  { href: '/my-tasks', icon: Briefcase, label: 'My Tasks', tour: 'nav-my-tasks' },
];

// Top-right header cluster: a persistent "Home" link (always reachable without
// opening the menu) + a name dropdown with profile items and session actions.
export default function UserMenu() {
  const { profile } = useProfile();
  const { crownTier } = useChampions();
  const { isAdmin, previewAsUser, setPreviewAsUser, isProfileItemHidden, isProfileItemComingSoon } = useMenuVisibility();
  const displayName = displayNameFromProfile(profile);
  const myTier = profile ? crownTier(resolveLearnerId(profile)) : 0;

  // Okta drives identity once it's configured; until then the "session" is the
  // IdentityGate soft-login cookie, which NextAuth's signOut doesn't touch.
  const oktaConfigured = !!process.env.NEXT_PUBLIC_OKTA_CONFIGURED;

  const [open, setOpen] = useState(false);

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

      <PausedLessonsBell />

      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen(p => !p)}
          data-tour="name-menu"
          className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-pill text-sm text-white/90 hover:bg-white/10 transition-all"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="hidden sm:inline">{displayName}</span>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Avatar avatar={profile?.avatar} size={30} crown={myTier} title={displayName} />
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 rounded-2xl shadow-2xl py-1.5 z-[60] overflow-hidden"
            style={{
              background: 'var(--navbg, #fff)',
              border: '1px solid var(--line, rgba(10,36,67,.1))',
              backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
              color: 'var(--ink, #0A2443)',
            }}
          >
            <div className="px-4 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--line, rgba(10,36,67,.1))' }}>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink, #0A2443)' }}>{displayName}</p>
            </div>
            {PROFILE_LINKS.map(link => {
              // Admin "Profile Visibility" can hide an item (dropped) or mark it
              // "Coming soon" (shown greyed, non-clickable). Admins see all.
              if (isProfileItemHidden(link.href)) return null;
              if (isProfileItemComingSoon(link.href)) {
                return (
                  <div
                    key={link.href}
                    role="menuitem"
                    aria-disabled="true"
                    className="flex items-center gap-3 mx-1.5 px-3 py-2 text-sm cursor-not-allowed"
                    style={{ color: 'var(--ink-dim, rgba(10,36,67,.6))' }}
                  >
                    <link.icon className="w-4 h-4 shrink-0" />
                    <span className="line-through">{link.label}</span>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-amber-500">Soon</span>
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  data-tour={link.tour}
                  className="flex items-center gap-3 mx-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--glass)]"
                  style={{ color: 'var(--ink, #0A2443)' }}
                >
                  <link.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-dim, rgba(10,36,67,.6))' }} />
                  {link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--line, rgba(10,36,67,.1))' }}>
                <button
                  onClick={() => { setPreviewAsUser(!previewAsUser); setOpen(false); }}
                  role="menuitem"
                  className="w-full flex items-center gap-3 mx-1.5 px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--glass)]"
                  style={{ color: 'var(--ink, #0A2443)', width: 'calc(100% - 0.75rem)' }}
                >
                  {previewAsUser ? (
                    <>
                      <Shield className="w-4 h-4 text-brand shrink-0" />
                      Back to admin view
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 shrink-0" style={{ color: 'var(--ink-dim, rgba(10,36,67,.6))' }} />
                      Preview as user
                    </>
                  )}
                </button>
              </div>
            )}
            <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--line, rgba(10,36,67,.1))' }}>
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-3 mx-1.5 px-3 py-2 rounded-lg text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                style={{ width: 'calc(100% - 0.75rem)' }}
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
