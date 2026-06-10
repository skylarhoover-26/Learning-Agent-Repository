'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useProfile } from '@/components/profile-provider';
import { Settings, LogOut, FileText, ChevronDown, Briefcase, UserCog } from 'lucide-react';

export default function UserMenu() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    signOut({ callbackUrl: '/auth/signin' });
  }

  const displayName = profile?.display_name || profile?.slack_handle || 'Learner';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 text-sm text-white/90 hover:text-white transition-colors"
      >
        <span className="hidden sm:inline">{displayName}</span>
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm">
          {initial}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-ink dark:text-slate-200">{displayName}</p>
            {profile?.email && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{profile.email}</p>
            )}
          </div>

          <Link
            href="/my-role"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <UserCog className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            My Role
          </Link>

          <Link
            href="/my-tasks"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Briefcase className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            My Tasks
          </Link>

          {isAdmin && (
            <Link
              href="/curriculum-pipeline"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Content Updates
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Admin Dashboard
            </Link>
          )}

          {process.env.NEXT_PUBLIC_OKTA_CONFIGURED && (
            <div className="border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
