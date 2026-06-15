'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Home, ChevronDown, User, UserCog, Briefcase, FolderKanban, RefreshCw, LogOut } from 'lucide-react';
import { useProfile } from '@/components/profile-provider';
import { displayNameFromProfile } from '@/lib/display-name';

// Profile-related links that live under the name dropdown (everything that used
// to be in the sidebar's "Account" section except Manager, which stays in the menu).
const PROFILE_LINKS = [
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/my-role', icon: UserCog, label: 'My Role' },
  { href: '/my-tasks', icon: Briefcase, label: 'My Tasks' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
];

// Top-right header cluster: a persistent "Home" link (always reachable without
// opening the menu) + a name dropdown with profile items and session actions.
export default function UserMenu() {
  const { profile } = useProfile();
  const displayName = displayNameFromProfile(profile);
  const initial = displayName.charAt(0).toUpperCase();

  const [open, setOpen] = useState(false);
  const [softLogin, setSoftLogin] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    fetch('/api/identity')
      .then(r => r.json())
      .then(d => setSoftLogin(!d.oktaConfigured && !!d.email))
      .catch(() => {});
  }, []);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  async function handleSwitchUser() {
    try { await fetch('/api/identity', { method: 'DELETE' }); } catch { /* reload still shows the gate */ }
    window.location.reload();
  }

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

      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen(p => !p)}
          data-tour="name-menu"
          className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-pill text-sm text-white/90 hover:bg-white/10 transition-all"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="hidden sm:inline">{displayName}</span>
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm">
            {initial}
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
            {PROFILE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <link.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                {link.label}
              </Link>
            ))}
            {(softLogin || process.env.NEXT_PUBLIC_OKTA_CONFIGURED) && (
              <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                {softLogin && (
                  <button
                    onClick={handleSwitchUser}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    Switch user
                  </button>
                )}
                {process.env.NEXT_PUBLIC_OKTA_CONFIGURED && (
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                    role="menuitem"
                    className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Log out
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
