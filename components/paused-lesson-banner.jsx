'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pause, Play, X } from 'lucide-react';

// The plan-driven lesson player saves an in-progress lesson here when paused.
const SAVE_KEY = 'lp_plan_lesson';
const FORMAT_LABEL = { standard: 'Quick Lesson', deep_dive: 'Deep Dive', project_quest: 'Project Quest' };

// Surfaces a paused plan-driven lesson on the Lesson picker so someone working
// through many lessons can jump back into the one they left. Reads the player's
// save from localStorage. Dismiss only hides it for the session — the saved
// lesson itself is untouched, so it reappears next visit until the lesson is
// finished (the player clears the save on completion).
export default function PausedLessonBanner() {
  const [paused, setPaused] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      // Only treat it as resumable if it has a topic and isn't already finished.
      const isLive = saved && saved.topic && (saved.steps?.length || saved.plan);
      setPaused(isLive ? saved : null);
    } catch {
      setPaused(null);
    }
  }, []);

  if (!paused || dismissed) return null;

  const fmt = FORMAT_LABEL[paused.format] || 'Lesson';
  const stepNum = (paused.stepIdx || 0) + 1;
  const stepTotal = paused.steps?.length || 0;
  const href = `/lesson?topic=${encodeURIComponent(paused.topic)}&format=${encodeURIComponent(paused.format || 'standard')}`;

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-4 py-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand text-white shrink-0">
        <Pause className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink dark:text-slate-200 truncate">
          <span className="font-semibold">Lesson paused:</span> {paused.topic}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {fmt}{stepTotal ? ` · Step ${stepNum} of ${stepTotal}` : ''} — pick up where you left off
        </p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-all shrink-0"
      >
        <Play className="w-3.5 h-3.5" /> Resume
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Hide for now"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
