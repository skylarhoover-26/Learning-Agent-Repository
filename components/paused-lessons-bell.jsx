'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Play, ArrowRight } from 'lucide-react';
import { listPausedLessons, relativeAccessTime, absoluteAccessDate } from '@/lib/paused-lessons';

const FORMAT_LABEL = {
  quick_tip: 'Quick Tip',
  standard: 'Quick Lesson',
  deep_dive: 'Deep Dive',
  project_quest: 'Project Quest',
};

// Header bell that previews unfinished ("paused") lessons in a dropdown and lets
// the learner resume any of them with one click (via /lesson?resume=<key>),
// rather than abruptly bouncing them to the picker. Hidden when nothing's paused.
export default function PausedLessonsBell() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const refresh = () => {
      try { setItems(listPausedLessons()); } catch { setItems([]); }
    };
    refresh();
    window.addEventListener('paused-lessons:changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('paused-lessons:changed', refresh);
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

  const count = items.length;
  if (count === 0) return null;

  function resume(entry) {
    setOpen(false);
    // Fire an event so resuming works even when we're ALREADY on /lesson —
    // pushing the same ?resume= URL wouldn't change searchParams, so the
    // deep-link effect on the lesson page would never re-run. The push below
    // still handles resuming from any other screen (cold mount).
    window.dispatchEvent(new CustomEvent('lesson:resume', { detail: { key: entry.key } }));
    router.push(`/lesson?resume=${encodeURIComponent(entry.key)}`);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={`${count} unfinished ${count === 1 ? 'lesson' : 'lessons'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${count} unfinished ${count === 1 ? 'lesson' : 'lessons'}`}
        className="relative flex items-center justify-center w-9 h-9 rounded-pill text-white/90 hover:text-white hover:bg-white/10 transition-all"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-900 text-[11px] font-bold flex items-center justify-center">
          {count}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-bold text-ink dark:text-slate-200">Unfinished lessons</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Pick up right where you left off</p>
          </div>

          <ul className="max-h-80 overflow-y-auto py-1">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  onClick={() => resume(it)}
                  role="menuitem"
                  className="group w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 dark:bg-slate-700 text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                    <Play className="w-3.5 h-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink dark:text-slate-200 truncate">
                      <span className="font-semibold">{FORMAT_LABEL[it.format] || 'Lesson'}:</span> {it.topic}
                    </span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
                      {it.stepLabel ? `${it.stepLabel} · ` : ''}last opened {relativeAccessTime(it.lastAccessedAt)}
                      {absoluteAccessDate(it.lastAccessedAt) ? ` · ${absoluteAccessDate(it.lastAccessedAt)}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => { setOpen(false); router.push('/lesson?paused=1'); }}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-brand border-t border-slate-100 dark:border-slate-700 hover:bg-brand-50 dark:hover:bg-slate-700 transition-colors"
          >
            View all in lessons <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
