'use client';

import Link from 'next/link';
import { useProgression } from './progression-provider';
import { BookOpen, ChevronRight } from 'lucide-react';

function shortTopic(t, max = 80) {
  if (!t) return '';
  return t.length <= max ? t : t.substring(0, max - 1) + '...';
}

export default function LiveRecentLesson() {
  const prog = useProgression();
  if (!prog?.isLoaded || prog.lessonHistory.length === 0) return null;

  const lastLesson = prog.lessonHistory[0];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-brand" />
            <h3 className="font-semibold text-ink dark:text-slate-200">Pick up where you left off</h3>
          </div>
          <p className="text-ink dark:text-slate-200 mb-1">{shortTopic(lastLesson.topic)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last completed {new Date(lastLesson.completed_at).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/lesson?topic=${encodeURIComponent(lastLesson.topic)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cta text-ink rounded-pill font-semibold hover:bg-cta-600 transition-all shadow-sm"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
