'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Play, ArrowRight } from 'lucide-react';
import { listPausedLessons, relativeAccessTime, absoluteAccessDate } from '@/lib/paused-lessons';
import {
  listNotifications, markNotificationsRead, unreadNotificationCount,
} from '@/lib/notifications-store';

const FORMAT_LABEL = {
  quick_tip: 'Quick Tip',
  standard: 'Quick Lesson',
  deep_dive: 'Deep Dive',
  project_quest: 'Project Quest',
};

// Header bell / notification center. Shows a single chronological feed of
// everything worth surfacing — XP earned, badges, level-ups and streaks — woven
// in with unfinished ("paused") lessons you can resume in one click. The badge
// counts unseen notifications plus any unfinished lessons. Hidden only when
// there's truly nothing to show.
export default function PausedLessonsBell() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const refresh = () => {
      try { setLessons(listPausedLessons()); } catch { setLessons([]); }
      try { setNotifications(listNotifications()); } catch { setNotifications([]); }
      try { setUnread(unreadNotificationCount()); } catch { setUnread(0); }
    };
    refresh();
    window.addEventListener('paused-lessons:changed', refresh);
    window.addEventListener('notifications:changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('paused-lessons:changed', refresh);
      window.removeEventListener('notifications:changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Opening the bell marks notifications as seen (the unread badge resets, but
  // the items stay in the feed and unfinished lessons keep counting).
  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next && unread > 0) { markNotificationsRead(); setUnread(0); }
      return next;
    });
  }

  // Newest-first merge of unfinished lessons and activity notifications.
  const feed = [
    ...lessons.map((l) => ({ kind: 'lesson', sortTs: l.lastAccessedAt || l.startedAt || '', data: l })),
    ...notifications.map((n) => ({ kind: 'notification', sortTs: n.ts || '', data: n })),
  ].sort((a, b) => String(b.sortTs).localeCompare(String(a.sortTs)));

  const badgeCount = unread + lessons.length;
  if (feed.length === 0) return null;

  function resume(entry) {
    setOpen(false);
    // Fire an event so resuming works even when we're ALREADY on /lesson —
    // pushing the same ?resume= URL wouldn't change searchParams, so the
    // deep-link effect on the lesson page would never re-run. The push below
    // still handles resuming from any other screen (cold mount).
    window.dispatchEvent(new CustomEvent('lesson:resume', { detail: { key: entry.key } }));
    router.push(`/lesson?resume=${encodeURIComponent(entry.key)}`);
  }

  function openNotification(n) {
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  const label = badgeCount > 0
    ? `${badgeCount} notification${badgeCount === 1 ? '' : 's'}`
    : 'Notifications';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggleOpen}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className="relative flex items-center justify-center w-9 h-9 rounded-pill text-white/90 hover:text-white hover:bg-white/10 transition-all"
      >
        <Bell className="w-[18px] h-[18px]" />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold flex items-center justify-center">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-bold text-ink dark:text-slate-200">Notifications</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">XP, badges &amp; lessons to pick back up</p>
          </div>

          <ul className="max-h-96 overflow-y-auto py-1">
            {feed.map((item) => (
              item.kind === 'lesson' ? (
                <li key={`l_${item.data.key}`}>
                  <button
                    onClick={() => resume(item.data)}
                    role="menuitem"
                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                      <Play className="w-3.5 h-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink dark:text-slate-200 truncate">
                        <span className="font-semibold">{FORMAT_LABEL[item.data.format] || 'Lesson'}:</span> {item.data.topic}
                      </span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
                        {item.data.stepLabel ? `${item.data.stepLabel} · ` : ''}resume · last opened {relativeAccessTime(item.data.lastAccessedAt)}
                        {absoluteAccessDate(item.data.lastAccessedAt) ? ` · ${absoluteAccessDate(item.data.lastAccessedAt)}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ) : (
                <li key={`n_${item.data.id}`}>
                  <div
                    role={item.data.href ? 'menuitem' : undefined}
                    onClick={item.data.href ? () => openNotification(item.data) : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${item.data.href ? 'cursor-pointer hover:bg-brand-50 dark:hover:bg-slate-700' : ''}`}
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-slate-700 text-base shrink-0">
                      {item.data.emoji || '✨'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink dark:text-slate-200 truncate font-medium">
                        {item.data.title}
                      </span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
                        {item.data.detail ? `${item.data.detail} · ` : ''}{relativeAccessTime(item.data.ts)}
                      </span>
                    </span>
                  </div>
                </li>
              )
            ))}
          </ul>

          {lessons.length > 0 && (
            <button
              onClick={() => { setOpen(false); router.push('/lesson?paused=1'); }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-brand border-t border-slate-100 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
            >
              View all unfinished lessons <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
