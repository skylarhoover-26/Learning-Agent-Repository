'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import {
  BookOpen, ChevronRight, Filter, Search, Sparkles,
} from 'lucide-react';
import { getAllLessons, getLessonCategories } from '@/lib/structured-lessons-data';
import { useProfile } from '@/components/profile-provider';
import { dailyPick, REFRESH_LABEL } from '@/lib/content-day';
import { sortByDifficulty } from '@/lib/difficulty';

const DIFFICULTY_COLORS = {
  Beginner: 'bg-green-50 text-green-700 border-green-200',
  Intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  Advanced: 'bg-red-50 text-red-700 border-red-200',
};

// Map the learner's tier to the practice difficulty that fits them best.
const TIER_DIFFICULTY = {
  beginner: 'Beginner',
  practitioner: 'Intermediate',
  intermediate: 'Intermediate',
  power_user: 'Advanced',
  builder: 'Advanced',
  developer: 'Advanced',
};

export default function StructuredLessonPicker() {
  const { profile } = useProfile();
  const lessons = getAllLessons();
  const categories = getLessonCategories();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // "Today's practice" — a day-stable, role-weighted pick from the catalog that
  // rotates at 8 AM PT. Prefer lessons matching the learner's level.
  const todaysPicks = useMemo(() => {
    const sig = `${profile?.department || ''}|${profile?.tier || ''}`;
    const preferred = TIER_DIFFICULTY[profile?.tier] || null;
    const pool = preferred ? lessons.filter((l) => l.difficulty === preferred) : lessons;
    return dailyPick(pool.length >= 2 ? pool : lessons, 2, sig);
  }, [lessons, profile?.department, profile?.tier]);

  const filtered = sortByDifficulty(lessons.filter(l => {
    const matchesCategory = selectedCategory === 'All' || l.category === selectedCategory;
    const matchesSearch = !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      l.persona.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }));

  return (
    <div className="min-h-screen bg-bg-warm dark:bg-slate-900">
      <PageHeader
        icon={BookOpen}
        title="Structured Lessons"
        subtitle="Practice real-world AI skills with guided 5-step exercises"
      />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Today's practice — personalized, fresh daily */}
        {todaysPicks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-cta-600" />
              <h2 className="font-bold text-ink dark:text-slate-200">Today&apos;s practice for you</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">· {REFRESH_LABEL}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todaysPicks.map((lesson) => (
                <Link
                  key={`pick-${lesson.id}`}
                  href={`/structured-lesson/${lesson.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-cta-200 dark:border-slate-700 shadow-card hover:shadow-md hover:border-cta-300 transition-all p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{lesson.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                          {lesson.difficulty}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{lesson.category}</span>
                      </div>
                      <h3 className="text-base font-bold text-ink dark:text-slate-200 tracking-tight group-hover:text-brand transition-colors mb-1">{lesson.title}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{lesson.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cta-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-6 mb-8">
          <h2 className="text-sm font-bold text-ink dark:text-slate-200 uppercase tracking-wide mb-3">How it works</h2>
          <div className="grid grid-cols-5 gap-4">
            {[
              { step: 'Read', desc: 'Understand the scenario', color: 'bg-brand-50 text-brand-700' },
              { step: 'Try', desc: 'Write your version', color: 'bg-cta-50 text-cta-700' },
              { step: 'Compare', desc: 'See AI alternatives', color: 'bg-purple-50 text-purple-700' },
              { step: 'Ship', desc: 'Pick the best one', color: 'bg-green-50 text-green-700' },
              { step: 'Reflect', desc: 'Capture your takeaway', color: 'bg-indigo-50 text-indigo-700' },
            ].map(({ step, desc, color }) => (
              <div key={step} className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${color} text-xs font-bold mb-1.5`}>
                  {step.charAt(0)}
                </div>
                <p className="text-xs font-semibold text-ink dark:text-slate-200">{step}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-ink dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lesson cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(lesson => (
            <Link
              key={lesson.id}
              href={`/structured-lesson/${lesson.id}`}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-md hover:border-brand-200 dark:hover:border-brand-700 transition-all p-6"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">{lesson.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wide border ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                      {lesson.difficulty}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {lesson.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink dark:text-slate-200 tracking-tight group-hover:text-brand transition-colors mb-1">
                    {lesson.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                    {lesson.subtitle}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      For: {lesson.persona}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="text-sm">No lessons match your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}
