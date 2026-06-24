'use client';

import { useState, useEffect } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { listPausedLessons, removePausedLessonByKey, relativeAccessTime, absoluteAccessDate } from '@/lib/paused-lessons';

const FORMAT_LABEL = {
  quick_tip: 'Quick Tip',
  standard: 'Quick Lesson',
  deep_dive: 'Deep Dive',
  project_quest: 'Project Quest',
};

// Lists every paused lesson (all formats), most-recently-accessed first and
// numbered, so people juggling several can jump back into any of them — and
// delete the ones they're done with. Resume happens in-page via onResume (the
// parent sets lesson state directly), so it works even though we're already on
// the lesson route.
export default function PausedLessonsBox({ onResume }) {
  const [items, setItems] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(listPausedLessons());
  }, []);

  function handleDelete(key) {
    removePausedLessonByKey(key);
    setItems(listPausedLessons());
  }

  if (!mounted || items.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-brand-200 dark:border-slate-700 bg-brand-50/60 dark:bg-slate-800 p-5">
      <h3 className="flex items-center gap-2 font-bold text-ink dark:text-slate-200 mb-3">
        <Pause className="w-5 h-5 text-brand" /> Paused lessons
        <span className="text-xs font-medium text-slate-400">({items.length})</span>
      </h3>
      <ol className="space-y-2.5">
        {items.map((it, i) => (
          <li
            key={it.key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 dark:bg-slate-700 text-brand text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink dark:text-slate-200 truncate">
                <span className="font-semibold">{FORMAT_LABEL[it.format] || 'Lesson'}:</span> {it.topic}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {it.stepLabel ? `${it.stepLabel} · ` : ''}last opened {relativeAccessTime(it.lastAccessedAt)}
                {absoluteAccessDate(it.lastAccessedAt) ? ` · ${absoluteAccessDate(it.lastAccessedAt)}` : ''}
              </p>
            </div>
            <button
              onClick={() => onResume?.(it)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
            <button
              onClick={() => handleDelete(it.key)}
              aria-label={`Delete paused lesson: ${it.topic}`}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
