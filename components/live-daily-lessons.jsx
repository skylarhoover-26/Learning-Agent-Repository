'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, Zap, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { difficultyPillBase, difficultyPillClass, difficultyLabel } from '@/lib/difficulty';

const CATEGORY_DOTS = {
  'Applied AI': 'bg-blue-500',
  'Prompting': 'bg-purple-500',
  'Technical': 'bg-amber-500',
  'Strategy': 'bg-green-500',
  'Writing': 'bg-pink-500',
};

export default function LiveDailyLessons() {
  const [lessons, setLessons] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/daily-lessons');
        if (!res.ok) return;
        const data = await res.json();
        setLessons(data.lessons || []);
      } catch {
        // silent fail
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  if (!loaded || lessons.length === 0) return null;

  const pinned = lessons.filter(l => l.pinned);
  const display = pinned.length > 0 ? pinned.slice(0, 3) : lessons.slice(0, 3);

  return (
    <Link
      href="/daily"
      className="group block bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 hover:border-brand-200 hover:shadow-card-hover p-6 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-brand" />
          <h3 className="font-semibold text-ink dark:text-slate-200">Today&apos;s Lessons</h3>
          <span className="text-xs text-slate-400">({lessons.length})</span>
        </div>
        <span className="text-sm font-medium text-brand group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </span>
      </div>

      <div className="space-y-3">
        {display.map(lesson => (
          <div key={lesson.id} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${CATEGORY_DOTS[lesson.category] || 'bg-slate-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink dark:text-slate-200 text-sm truncate">{lesson.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-slate-400">{lesson.category}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {lesson.duration}
                </span>
                {lesson.difficulty && (
                  <span className={`${difficultyPillBase} ${difficultyPillClass(lesson.difficulty)}`}>
                    {difficultyLabel(lesson.difficulty)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lessons.length > 3 && (
        <p className="text-xs text-slate-400 mt-3">+ {lessons.length - 3} more lessons today</p>
      )}
    </Link>
  );
}
